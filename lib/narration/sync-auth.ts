import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/** Sent by the app's own kick, so a call from the cron job can be told apart. */
export const SYNC_SOURCE_HEADER = "x-internal-source";

type SyncSource = "cron" | "app";

/** Compares digests, so a token of any length is checked without throwing and
 *  without revealing where it differs. */
function sameSecret(token: string, secret: string): boolean {
  const a = createHash("sha256").update(token).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

type SyncAuthResult =
  | { ok: true; source: SyncSource; error?: undefined }
  | { ok?: undefined; error: NextResponse };

/** The narration sync route accepts only AI_INTERNAL_SECRET. The Telegram
 *  routes keep their own secret, and this one never opens them. */
export function authenticateNarrationSyncRequest(request: Request): SyncAuthResult {
  const secret = process.env.AI_INTERNAL_SECRET?.trim();
  if (!secret) {
    console.error("AI_INTERNAL_SECRET is not set");
    return {
      error: NextResponse.json({ error: "Server misconfigured." }, { status: 500 }),
    };
  }

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? "";
  if (!sameSecret(token, secret)) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  return {
    ok: true,
    source: request.headers.get(SYNC_SOURCE_HEADER) === "app" ? "app" : "cron",
  };
}

/** The secret the app uses when it calls its own sync route. */
export function getNarrationSyncSecret(): string {
  const secret = process.env.AI_INTERNAL_SECRET?.trim();
  if (!secret) throw new Error("AI_INTERNAL_SECRET is not set");
  return secret;
}
