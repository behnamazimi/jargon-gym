import { NextResponse } from "next/server";

export function authenticateInternalTelegramRequest(request: Request) {
  const secret = process.env.TELEGRAM_INTERNAL_SECRET;
  if (!secret) {
    console.error("TELEGRAM_INTERNAL_SECRET is not set");
    return {
      error: NextResponse.json(
        { error: "Server misconfigured.", code: "MISSING_TELEGRAM_INTERNAL_SECRET" },
        { status: 500 },
      ),
    };
  }

  const header = request.headers.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  if (match?.[1] !== secret) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized.", code: "INVALID_TELEGRAM_INTERNAL_SECRET" },
        { status: 401 },
      ),
    };
  }

  return { ok: true as const };
}
