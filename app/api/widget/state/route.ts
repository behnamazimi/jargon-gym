import { NextResponse } from "next/server";
import { fetchWidgetState } from "@/lib/jargon/widget-projection";
import { authenticateWidgetRequest } from "@/lib/widget/auth-request";

export async function GET(request: Request) {
  const auth = await authenticateWidgetRequest(request);
  if ("error" in auth) return auth.error;

  try {
    const state = await fetchWidgetState(auth.admin, auth.userId);
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load widget state.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
