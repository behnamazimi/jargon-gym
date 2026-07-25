import { TELEGRAM_LINK_TOKEN_CONTRACT } from "./link-token-contract.ts";

/** @see TELEGRAM_LINK_TOKEN_CONTRACT — Deno adapter (Web Crypto). */
export async function hashLinkToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest(TELEGRAM_LINK_TOKEN_CONTRACT.hashAlgorithm, data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
