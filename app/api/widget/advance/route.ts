import { NextResponse } from "next/server";
import { fetchWidgetState } from "@/lib/jargon/widget-projection";
import { recordRead } from "@/lib/jargon/review-outcome";
import { authenticateWidgetRequest } from "@/lib/widget/auth-request";
import { LATEST_WIDGET_VERSION } from "@/lib/widget/version";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: unknown): id is string {
  return typeof id === "string" && UUID_RE.test(id);
}

type AdvanceRequestBody = { termId: string; record: boolean; excludeIds: string[] };

async function parseAdvanceRequest(request: Request): Promise<AdvanceRequestBody | null> {
  const body = await request.json().catch(() => null);
  const termId = body?.termId;
  if (!isValidUuid(termId)) return null;

  const record = body?.record === true;
  const excludeIds = Array.isArray(body?.excludeIds)
    ? body.excludeIds.filter(isValidUuid).slice(0, 10)
    : [];

  return { termId, record, excludeIds };
}

/**
 * Drops the term the widget just rotated past — recording its read unless
 * the Read page already did (termId/record) — and returns one fresh unknown
 * term to refill the pool, excluding whatever's still on screen (excludeIds).
 * One round trip per rotation, always against the live queue.
 */
export async function POST(request: Request) {
  const auth = await authenticateWidgetRequest(request);
  if ("error" in auth) return auth.error;

  try {
    const parsed = await parseAdvanceRequest(request);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid termId." }, { status: 400 });
    }

    if (parsed.record) {
      await recordRead(auth.admin, auth.userId, parsed.termId, "admin");
    }

    const state = await fetchWidgetState(auth.admin, auth.userId, parsed.excludeIds, 1);

    return NextResponse.json({
      term: state.terms[0] ?? null,
      totalCount: state.totalCount,
      termsLearnedCount: state.termsLearnedCount,
      latestWidgetVersion: LATEST_WIDGET_VERSION,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't advance the widget queue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
