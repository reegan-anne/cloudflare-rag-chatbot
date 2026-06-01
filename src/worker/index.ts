import type { Env } from './env';
import { handleChat } from './chat';

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/api/chat') {
      return handleChat(req, env);
    }
    if (url.pathname === '/api/health') {
      return Response.json({ ok: true });
    }

    // Everything else (including /widget.js, sitemaps, doc pages) falls
    // through to the static assets bundle that Astro builds into ./dist.
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
