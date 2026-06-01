/**
 * Ingest the docs/ corpus into Cloudflare Vectorize.
 *
 * Reads every .md/.mdx under ../docs, chunks each file, embeds chunks via
 * Workers AI (REST), then upserts vectors into Vectorize (REST).
 *
 * Run locally:
 *   CLOUDFLARE_API_TOKEN=… npm run ingest
 *
 * Flags:
 *   --full      Delete every vector in the index before reinserting.
 *   --dry-run   Chunk only — don't embed or upload.
 *
 * Env:
 *   CLOUDFLARE_API_TOKEN   — token with Workers AI: Read + Vectorize: Edit
 *   CLOUDFLARE_ACCOUNT_ID  — your Cloudflare account ID (required)
 *   VECTORIZE_INDEX        — defaults to "cloudflare-rag-chatbot"
 *   EMBED_MODEL            — defaults to "@cf/baai/bge-large-en-v1.5"
 *   EMBED_DIM              — defaults to 1024
 *
 * File-walking + batching skeleton derived from rootsongjc/rag-chatbot
 * (Apache 2.0); embedding + upsert paths rewritten for Workers AI + Vectorize.
 */
import { globby } from 'globby';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { chunkText } from '../src/worker/rag/chunk';
import { markdownToPlain } from '../src/worker/rag/md';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const INDEX = process.env.VECTORIZE_INDEX || 'cloudflare-rag-chatbot';
const EMBED_MODEL = process.env.EMBED_MODEL || '@cf/baai/bge-large-en-v1.5';
const EMBED_DIM = Number(process.env.EMBED_DIM || 1024);
const BATCH_EMBED = 50;
const BATCH_UPSERT = 200;

const FULL = process.argv.includes('--full');
const DRY = process.argv.includes('--dry-run');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, '..', 'docs');

interface VectorItem {
  id: string;
  values: number[];
  metadata: {
    text: string;
    title: string;
    description?: string;
    url: string;
    source: string;
    chunkIndex: number;
  };
}

function urlForFile(absFile: string): string {
  const rel = path.relative(DOCS_DIR, absFile).replace(/\\/g, '/');
  let withoutExt = rel.replace(/\.(md|mdx)$/i, '');
  if (withoutExt === 'index') return '/';
  if (withoutExt.endsWith('/index')) withoutExt = withoutExt.slice(0, -'/index'.length);
  return '/' + withoutExt + '/';
}

function vectorId(source: string, chunkIndex: number): string {
  return createHash('sha1').update(`${source}|${chunkIndex}`).digest('hex').slice(0, 16);
}

interface CfInit {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

async function cfFetch(pathname: string, init: CfInit = {}) {
  const isString = typeof init.body === 'string';
  const isBytes = init.body instanceof Uint8Array;
  const headers: Record<string, string> = {
    authorization: `Bearer ${API_TOKEN}`,
    ...(init.body && !isString && !isBytes ? { 'content-type': 'application/json' } : {}),
    ...(init.headers || {}),
  };
  const body =
    init.body == null
      ? undefined
      : isString || isBytes
        ? (init.body as BodyInit)
        : JSON.stringify(init.body);

  const res = await fetch(`https://api.cloudflare.com/client/v4${pathname}`, {
    method: init.method,
    headers,
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CF ${res.status} ${pathname}: ${text}`);
  }
  return res;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await cfFetch(`/accounts/${ACCOUNT_ID}/ai/run/${EMBED_MODEL}`, {
    method: 'POST',
    body: { text: texts },
  });
  const json = (await res.json()) as {
    result?: { data?: number[][]; shape?: number[] };
  };
  const data = json.result?.data;
  if (!Array.isArray(data) || data.length !== texts.length) {
    throw new Error(`Workers AI returned ${data?.length ?? 0} vectors for ${texts.length} inputs`);
  }
  return data;
}

async function upsertBatch(items: VectorItem[]) {
  // Vectorize v2 insert/upsert expects NDJSON.
  const ndjson = items
    .map((it) =>
      JSON.stringify({
        id: it.id,
        values: it.values,
        metadata: it.metadata,
      }),
    )
    .join('\n');
  const res = await cfFetch(`/accounts/${ACCOUNT_ID}/vectorize/v2/indexes/${INDEX}/upsert`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-ndjson' },
    body: ndjson,
  });
  await res.json();
}

async function deleteAll() {
  // Vectorize doesn't expose "delete all" — we delete the index and recreate
  // it. Recreation requires the metric/dim; we rely on the user having created
  // it once via `wrangler vectorize create`. So instead, for a full reindex we
  // skip the wipe and overwrite by id (ids are deterministic, so re-running
  // ingest is already idempotent for any chunk that still exists).
  //
  // To truly remove stale chunks (e.g. a deleted page), use:
  //   wrangler vectorize delete-vectors cloudflare-rag-chatbot --ids …
  // We don't try to compute "stale" automatically in v1.
  console.warn(
    '⚠ --full has no effect in v1; deterministic ids make upsert idempotent. To remove stale chunks, use `wrangler vectorize delete-vectors`.',
  );
}

async function main() {
  if (!API_TOKEN) {
    console.error('Set CLOUDFLARE_API_TOKEN (with Workers AI: Read + Vectorize: Edit).');
    process.exit(1);
  }
  if (!ACCOUNT_ID) {
    console.error('Set CLOUDFLARE_ACCOUNT_ID (your Cloudflare account ID).');
    process.exit(1);
  }

  const files = await globby(['**/*.md', '**/*.mdx'], { cwd: DOCS_DIR, absolute: true });
  if (files.length === 0) {
    console.error(`No markdown found under ${DOCS_DIR}`);
    process.exit(1);
  }

  console.log(`Found ${files.length} markdown files in ${DOCS_DIR}`);

  if (FULL) await deleteAll();

  const allItems: VectorItem[] = [];
  let totalChunks = 0;
  let skippedDraft = 0;

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf-8');
    const fm = matter(raw);
    if (fm.data?.draft === true) {
      skippedDraft++;
      continue;
    }
    const title =
      (fm.data?.title as string | undefined) || path.basename(file).replace(/\.(md|mdx)$/i, '');
    const description = fm.data?.description as string | undefined;
    const plain = markdownToPlain(fm.content);
    const chunks = chunkText(plain, 800);
    const source = path.relative(DOCS_DIR, file).replace(/\\/g, '/');
    const url = urlForFile(file);

    chunks.forEach((text, i) => {
      allItems.push({
        id: vectorId(source, i),
        values: [], // filled in below by embedBatch
        metadata: {
          text: text.length > 1500 ? text.slice(0, 1500) : text,
          title,
          description,
          url,
          source,
          chunkIndex: i,
        },
      });
    });
    totalChunks += chunks.length;
    console.log(`  ${source} → ${chunks.length} chunk${chunks.length === 1 ? '' : 's'}`);
  }

  console.log(`\n${allItems.length} chunks ready. ${skippedDraft} draft files skipped.`);
  if (DRY) {
    console.log('--dry-run: stopping before embedding.');
    return;
  }

  // Embed in batches of BATCH_EMBED, attach values to items.
  for (let i = 0; i < allItems.length; i += BATCH_EMBED) {
    const batch = allItems.slice(i, i + BATCH_EMBED);
    const vectors = await embedBatch(batch.map((it) => it.metadata.text));
    vectors.forEach((v, j) => {
      // Some models return more dims than the index has; truncate to EMBED_DIM.
      batch[j].values = v.length > EMBED_DIM ? v.slice(0, EMBED_DIM) : v;
    });
    process.stdout.write(`  embedded ${Math.min(i + BATCH_EMBED, allItems.length)}/${allItems.length}\r`);
  }
  process.stdout.write('\n');

  // Upsert in batches.
  for (let i = 0; i < allItems.length; i += BATCH_UPSERT) {
    const batch = allItems.slice(i, i + BATCH_UPSERT);
    await upsertBatch(batch);
    console.log(`  upserted ${Math.min(i + BATCH_UPSERT, allItems.length)}/${allItems.length}`);
  }

  console.log(`\n✓ ingested ${totalChunks} chunks across ${files.length - skippedDraft} files.`);
}

main().catch((err) => {
  console.error('Ingest failed:', err);
  process.exit(1);
});
