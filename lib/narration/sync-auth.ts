import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/** Sent by the app's own kick, so a call from the cron job can be told apart. */
export const SYNC_SOURCE_HEADER = "x-internal-source";

type SyncSecret = "ai" | "legacy";
type SyncSource = "cron" | "app";

/** Compares digests, so a token of any length is checked without throwing and
 *  without revealing where it differs. */
function sameSecret(token: string, secret: string | undefined): boolean {
  if (!secret) return false;
  const a = createHash("sha256").update(token).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

/** The narration sync route accepts the AI secret and, while the cron job still
 *  sends it, the older Telegram one. Only this route does: the new secret never
 *  opens the Telegram routes. Both are checked every time. */
type SyncAuthResult =
  | { ok: true; secret: SyncSecret; source: SyncSource; error?: undefined }
  | { ok?: undefined; error: NextResponse };

export function authenticateNarrationSyncRequest(request: Request): SyncAuthResult {
  const aiSecret = process.env.AI_INTERNAL_SECRET?.trim();
  const legacySecret = process.env.TELEGRAM_INTERNAL_SECRET?.trim();
  if (!aiSecret && !legacySecret) {
    console.error("Neither AI_INTERNAL_SECRET nor TELEGRAM_INTERNAL_SECRET is set");
    return {
      error: NextResponse.json({ error: "Server misconfigured." }, { status: 500 }),
    };
  }

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? "";
  const matchesAi = sameSecret(token, aiSecret);
  const matchesLegacy = sameSecret(token, legacySecret);
  if (!matchesAi && !matchesLegacy) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  return {
    ok: true,
    // Equal values can't be told apart, so they count as the old secret: the
    // admin page must not say the cron job moved when it may not have.
    secret: matchesAi && aiSecret !== legacySecret ? "ai" : "legacy",
    source: request.headers.get(SYNC_SOURCE_HEADER) === "app" ? "app" : "cron",
  };
}

/** The secret the app uses when it calls its own sync route. */
export function getNarrationSyncSecret(): string {
  const secret =
    process.env.AI_INTERNAL_SECRET?.trim() || process.env.TELEGRAM_INTERNAL_SECRET?.trim();
  if (!secret) throw new Error("Neither AI_INTERNAL_SECRET nor TELEGRAM_INTERNAL_SECRET is set");
  return secret;
}
