import { NextResponse } from "next/server";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { parseConsent } from "@/lib/consent/consent";
import { saveAnalyticsConsent } from "@/lib/consent/repository";

/** Records a signed-in member's analytics choice. Signed-out visitors keep only
 *  the cookie. A route rather than a Server Action for the same reason as
 *  `/api/settings/timezone`: it runs on page load, beside redirects. */
export async function POST(request: Request) {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  const consent = parseConsent((body as { consent?: string } | null)?.consent);
  if (!consent) return NextResponse.json({ error: "Unknown choice." }, { status: 400 });

  try {
    await saveAnalyticsConsent(auth.supabase, auth.user.id, consent);
    return NextResponse.json({});
  } catch (err) {
    console.error("Saving the analytics choice failed:", err);
    return NextResponse.json({ error: "Couldn't save your choice." }, { status: 500 });
  }
}
