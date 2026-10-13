import { NextResponse } from "next/server";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { saveUserTimezone } from "@/lib/streak/settings";

function isTimezone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Saves the browser's IANA timezone, used for streak day boundaries. A route
 *  rather than a Server Action: an action's reply updates the router, and one
 *  landing while a redirect reloads the page crashes Next's router. */
export async function POST(request: Request) {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  const timezone = (body as { timezone?: unknown } | null)?.timezone;
  if (!isTimezone(timezone)) {
    return NextResponse.json({ error: "Unknown timezone." }, { status: 400 });
  }

  try {
    await saveUserTimezone(auth.supabase, auth.user.id, timezone);
    return NextResponse.json({});
  } catch (err) {
    console.error("Saving the timezone failed:", err);
    return NextResponse.json({ error: "Couldn't save timezone." }, { status: 500 });
  }
}
