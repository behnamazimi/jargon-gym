import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** For uptime probes. Answers 200 only when the app can reach its database. */
export async function GET() {
  try {
    const { error } = await createAdminClient().from("users").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("health check failed:", error);
    return NextResponse.json(
      { ok: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
