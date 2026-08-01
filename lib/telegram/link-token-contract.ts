/** Canonical spec for Telegram deep-link token hashing.
 *  Adapter: lib/telegram/links.ts (completeTelegramLink)
 *  Consumer: SQL complete_telegram_link(p_token_hash, ...)
 */
export const TELEGRAM_LINK_TOKEN_CONTRACT = {
  tokenBytes: 32,
  tokenEncoding: "base64url",
  hashAlgorithm: "SHA-256",
  hashOutput: "lowercase-hex",
  ttlMs: 5 * 60 * 1000,
} as const;
