import { NextResponse } from "next/server";
import { fetchWidgetState } from "@/lib/jargon/widget-projection";
import { authenticateWidgetRequest } from "@/lib/widget/auth-request";
import { LATEST_WIDGET_VERSION } from "@/lib/widget/version";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseExclude(url: string): string[] {
  const { searchParams } = new URL(url);
  return searchParams
    .getAll("exclude")
    .filter((id) => UUID_RE.test(id))
    .slice(0, 10);
}

export async function GET(request: Request) {
  const auth = await authenticateWidgetRequest(request);
  if ("error" in auth) return auth.error;

  try {
    const excludeTermIds = parseExclude(request.url);
    const state = await fetchWidgetState(auth.admin, auth.userId, excludeTermIds);
    return NextResponse.json({ ...state, latestWidgetVersion: LATEST_WIDGET_VERSION });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load widget state.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
