import { NextResponse } from "next/server";
import { recordRead } from "@/lib/jargon/review-outcome";
import { authenticateWidgetRequest } from "@/lib/widget/auth-request";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: unknown): id is string {
  return typeof id === "string" && UUID_RE.test(id);
}

/**
 * Records the read for the term currently on screen without rotating the
 * pool — the widget's in-place reveal. Distinct from /advance, which always
 * drops the current term and pulls a replacement; reveal must leave the
 * term showing until the user moves on themselves.
 */
export async function POST(request: Request) {
  const auth = await authenticateWidgetRequest(request);
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json().catch(() => null);
    const termId = body?.termId;

    if (!isValidUuid(termId)) {
      return NextResponse.json({ error: "Invalid termId." }, { status: 400 });
    }

    await recordRead(auth.admin, auth.userId, termId, "admin");

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't record the read.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
