export interface Env {
  /** Workers AI binding. */
  AI: Ai;
  /** Vectorize index holding the embedded docs (see wrangler.jsonc). */
  VECTORIZE: VectorizeIndex;
  /** Static assets binding (the built docs site under ./dist). */
  ASSETS: Fetcher;

  // Public config (in vars).
  EMBED_MODEL: string;
  EMBED_DIM: string;
  ANTHROPIC_MODEL: string;
  AI_GATEWAY_ACCOUNT: string;
  AI_GATEWAY_NAME: string;
  TOP_K: string;

  // Secrets.
  /**
   * Cloudflare AI Gateway authentication token. Used with unified billing
   * — Cloudflare proxies the upstream Anthropic call with their managed
   * credentials and bills your CF account, so no Anthropic API key is needed.
   */
  CF_AIG_TOKEN: string;
}
