/**
 * The proxy (lib/supabase/proxy.ts) verifies each request's session with
 * supabase.auth.getUser() and forwards the result in these headers, so pages,
 * Server Actions and route handlers don't verify it again. It strips any
 * incoming copies first and signs what it sets, and readers check the
 * signature, so a request the proxy never saw can't claim to be anyone.
 */
const USER_ID_HEADER = "x-verified-user-id";
const USER_EMAIL_HEADER = "x-verified-user-email";
const SIGNATURE_HEADER = "x-verified-user-sig";

export const VERIFIED_USER_HEADERS = [USER_ID_HEADER, USER_EMAIL_HEADER, SIGNATURE_HEADER];

export type VerifiedUser = { id: string; email: string | null };

const encoder = new TextEncoder();
let signingKey: Promise<CryptoKey> | null = null;

/** Derived from a server-only secret both the proxy and the app can read. */
function getSigningKey(): Promise<CryptoKey> | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  signingKey ??= crypto.subtle.importKey(
    "raw",
    encoder.encode(`verified-user-header:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return signingKey;
}

function payload(id: string, email: string) {
  return encoder.encode(`${id}\n${email}`);
}

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (!/^(?:[0-9a-f]{2})+$/.test(hex)) return null;
  return Uint8Array.from(hex.match(/../g)!, (pair) => parseInt(pair, 16));
}

/** Sets the signed user headers. Emails are URI-encoded, since header values
 *  can't carry every character an address may contain. */
export async function setVerifiedUser(headers: Headers, user: VerifiedUser): Promise<void> {
  const key = getSigningKey();
  if (!key) return;
  const email = user.email ? encodeURIComponent(user.email) : "";
  const signature = await crypto.subtle.sign("HMAC", await key, payload(user.id, email));
  headers.set(USER_ID_HEADER, user.id);
  headers.set(USER_EMAIL_HEADER, email);
  headers.set(SIGNATURE_HEADER, toHex(signature));
}

/** The user the proxy verified for this request, or null when the headers are
 *  missing or weren't signed by the proxy. */
export async function readVerifiedUser(headers: Headers): Promise<VerifiedUser | null> {
  const id = headers.get(USER_ID_HEADER);
  const signature = fromHex(headers.get(SIGNATURE_HEADER) ?? "");
  const key = getSigningKey();
  if (!id || !signature || !key) return null;

  const email = headers.get(USER_EMAIL_HEADER) ?? "";
  const valid = await crypto.subtle.verify("HMAC", await key, signature, payload(id, email));
  if (!valid) return null;

  try {
    return { id, email: email ? decodeURIComponent(email) : null };
  } catch {
    return null;
  }
}
