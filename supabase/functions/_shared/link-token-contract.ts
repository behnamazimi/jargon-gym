/** Canonical spec for Telegram deep-link token hashing.
 *  Node adapter: lib/telegram/links.ts
 *  Deno adapter: supabase/functions/_shared/token.ts
 *  Consumer: SQL complete_telegram_link(p_token_hash, ...)
 *
 *  Keep in sync with lib/telegram/link-token-contract.ts
 */
export const TELEGRAM_LINK_TOKEN_CONTRACT = {
  tokenBytes: 32,
  tokenEncoding: "base64url",
  hashAlgorithm: "SHA-256",
  hashOutput: "lowercase-hex",
  ttlMs: 15 * 60 * 1000,
} as const;
