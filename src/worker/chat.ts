import type { Env } from './env';
import { embed } from './ai/embed';
import { generate } from './ai/anthropic';
import { retrieve } from './rag/retriever';
import { buildPrompt, type ChatTurn } from './rag/prompt';

interface ChatRequest {
  message: string;
  history?: ChatTurn[];
}

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

export async function handleChat(req: Request, env: Env): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return json({ error: 'invalid JSON' }, 400);
  }

  const message = (body.message ?? '').trim();
  if (!message) return json({ error: 'message is required' }, 400);
  if (message.length > 4000) {
    return json({ error: 'message too long (max 4000 chars)' }, 400);
  }

  const history = Array.isArray(body.history)
    ? body.history.filter(
        (t) =>
          t &&
          (t.role === 'user' || t.role === 'assistant') &&
          typeof t.content === 'string',
      )
    : [];

  try {
    const queryVector = await embed(env, message);
    const topK = Number(env.TOP_K) || 6;
    const { contexts, sources } = await retrieve(env, queryVector, topK);
    const { system, messages } = buildPrompt(message, contexts, history);
    const answer = await generate(env, system, messages);
    return json({ answer, sources });
  } catch (err) {
    console.error('chat error', err);
    const detail = err instanceof Error ? err.message : String(err);
    return json({ error: 'chat failed', detail }, 500);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}
