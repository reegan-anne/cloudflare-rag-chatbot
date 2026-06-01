import type { RetrievedChunk } from './retriever';
// Single source of truth for branding — see chatbot.config.json at the repo root.
// Bundled into the Worker at build time by wrangler/esbuild.
import config from '../../../chatbot.config.json';

const { persona, audience, offTopicLabel, fallbackHint } = config.prompt;

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface BuiltPrompt {
  /** Anthropic Messages API `system` field. */
  system: string;
  /** Anthropic Messages API `messages` array. */
  messages: ChatTurn[];
}

/**
 * Builds the system prompt + messages array for Anthropic's Messages API.
 * Injects retrieved context numbered [1]..[N] so the model can cite them.
 *
 * Structure derived from rootsongjc/rag-chatbot (Apache 2.0); persona and
 * wording are driven by chatbot.config.json so the template stays whitelabel.
 */
export function buildPrompt(
  question: string,
  contexts: RetrievedChunk[],
  history: ChatTurn[] = [],
): BuiltPrompt {
  const numbered = contexts
    .map((c, i) => `[${i + 1}] ${c.title} (${c.url})\n${c.text}`)
    .join('\n\n---\n\n');

  const system = [
    persona,
    audience,
    '',
    'Rules:',
    `1. Answer using ONLY the documentation context provided below. If the answer is not in the context, say so plainly and suggest where the user might look (e.g. "${fallbackHint}").`,
    '2. Be concise. Default to short paragraphs and bulleted lists. Avoid filler.',
    '3. Cite the docs by their bracket number — e.g. "Open the dashboard from the Home tab [1]." — when a specific claim comes from a context entry.',
    '4. Use the same plain English as the docs. Do not invent feature names, pricing, or behaviour that is not in the context.',
    '5. Do not paste raw URLs or file paths in your answer; the UI surfaces source links separately.',
    `6. If the user asks something off-topic (weather, politics, unrelated coding help), politely decline and redirect them to ${offTopicLabel}.`,
    '',
    '--- Documentation context ---',
    numbered || '(No matching documentation was retrieved for this question.)',
  ].join('\n');

  const messages: ChatTurn[] = [];
  for (const turn of history.slice(-6)) {
    messages.push({ role: turn.role, content: turn.content });
  }
  messages.push({ role: 'user', content: question });

  return { system, messages };
}
