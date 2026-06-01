import type { Env } from '../env';

/** Embed a single string via Workers AI. Returns a 1024-dim vector for bge-large-en-v1.5. */
export async function embed(env: Env, text: string): Promise<number[]> {
  const raw = await env.AI.run(env.EMBED_MODEL as any, { text: [text] });
  const res = raw as unknown as { data: number[][]; shape?: number[] };
  if (!res?.data?.[0]) {
    throw new Error('Workers AI returned no embedding');
  }
  return res.data[0];
}
