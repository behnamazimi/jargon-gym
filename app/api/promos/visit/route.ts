import { NextResponse } from "next/server";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { isVisitKey } from "@/lib/promos/promos";
import { markPromosSeen } from "@/lib/promos/settings";

/** Records that the member visited a page a promo points at. A route rather
 *  than a Server Action because it runs on page load (see `saveInBackground`). */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const key = `visit:${String((body as { target?: unknown } | null)?.target)}`;
  if (!isVisitKey(key)) return NextResponse.json({ error: "Unknown page." }, { status: 400 });

  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  try {
    await markPromosSeen(auth.supabase, [key]);
    return NextResponse.json({});
  } catch (err) {
    console.error("Saving the promo visit failed:", err);
    return NextResponse.json({ error: "Couldn't save your visit." }, { status: 500 });
  }
}
