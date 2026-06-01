import type { Env } from '../env';

export interface RetrievedChunk {
  id: string;
  text: string;
  title: string;
  url: string;
  score: number;
}

export interface RetrievalResult {
  contexts: RetrievedChunk[];
  /** Deduplicated source list — one entry per URL, ordered by best match. */
  sources: Array<{ title: string; url: string }>;
}

export async function retrieve(
  env: Env,
  queryVector: number[],
  topK: number,
): Promise<RetrievalResult> {
  const res = await env.VECTORIZE.query(queryVector, {
    topK,
    returnValues: false,
    returnMetadata: 'all',
  });

  const contexts: RetrievedChunk[] = res.matches
    .filter((m) => m.metadata && (m.metadata as any).text)
    .map((m) => {
      const meta = m.metadata as Record<string, string>;
      return {
        id: m.id,
        text: meta.text ?? '',
        title: meta.title ?? meta.source ?? m.id,
        url: meta.url ?? '#',
        score: m.score ?? 0,
      };
    });

  const sources: Array<{ title: string; url: string }> = [];
  const seen = new Set<string>();
  for (const c of contexts) {
    if (c.url === '#' || seen.has(c.url)) continue;
    seen.add(c.url);
    sources.push({ title: c.title, url: c.url });
  }

  return { contexts, sources };
}
