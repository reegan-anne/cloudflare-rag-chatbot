import MarkdownIt from 'markdown-it';

/**
 * Render markdown to HTML then strip tags to produce plaintext for embedding.
 * Derived from rootsongjc/rag-chatbot (Apache 2.0).
 */
const md = new MarkdownIt({ html: false, linkify: false, typographer: false });

export function markdownToPlain(mdContent: string): string {
  const html = md.render(mdContent);
  return html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, ' ')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
}
