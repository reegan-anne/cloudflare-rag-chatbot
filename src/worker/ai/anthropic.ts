import type { Env } from '../env';
import type { ChatTurn } from '../rag/prompt';

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
  stop_reason?: string;
  usage?: { input_tokens: number; output_tokens: number };
}

/**
 * Calls Anthropic's Messages API through Cloudflare AI Gateway using
 * **unified billing** — Cloudflare proxies the upstream call with their
 * managed Anthropic credentials and bills your CF account directly. The
 * Worker only needs an AI Gateway auth token, not an Anthropic API key.
 *
 * Gateway URL pattern:
 *   https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway}/anthropic/v1/messages
 */
export async function generate(
  env: Env,
  system: string,
  messages: ChatTurn[],
): Promise<string> {
  const url = `https://gateway.ai.cloudflare.com/v1/${env.AI_GATEWAY_ACCOUNT}/${env.AI_GATEWAY_NAME}/anthropic/v1/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'cf-aig-authorization': `Bearer ${env.CF_AIG_TOKEN}`,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1024,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic (via AI Gateway) ${res.status}: ${body}`);
  }

  const json = (await res.json()) as AnthropicResponse;
  const text = json.content
    .filter((c) => c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text as string)
    .join('');
  return text.trim();
}
