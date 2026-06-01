/**
 * Heading-aware chunker for English markdown-derived plaintext.
 *
 * - Split by markdown heading lines first (`#`, `##`, …, up to `######`).
 * - Within each section, further split into ~maxLen-char chunks on sentence
 *   boundaries (`.`, `!`, `?`, `;`) when possible.
 *
 * Derived from rootsongjc/rag-chatbot (Apache 2.0); simplified for
 * English-only corpora.
 */
export function chunkText(input: string, maxLen = 800): string[] {
  const sections = input
    .split(/^#{1,6}\s+/m)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  const pushChunk = (s: string) => {
    if (s.trim()) chunks.push(s.trim());
  };

  for (const sec of sections.length ? sections : [input]) {
    if (sec.length <= maxLen) {
      pushChunk(sec);
      continue;
    }
    let buf = '';
    for (const part of sec.split(/(?<=[.!?;]\s+)/)) {
      if ((buf + part).length > maxLen) {
        pushChunk(buf);
        buf = part;
      } else {
        buf += part;
      }
    }
    pushChunk(buf);
  }
  return chunks;
}
