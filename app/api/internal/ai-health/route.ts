import { NextResponse } from "next/server";
import { loadRefundSnapshot } from "@/lib/ai-credits/refund-snapshot";
import { authenticateNarrationSyncRequest } from "@/lib/narration/sync-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Read by the scheduled AI health workflow. Same secret as the narration sync. */
export async function GET(request: Request) {
  const auth = authenticateNarrationSyncRequest(request);
  if (auth.error) return auth.error;

  const snapshot = await loadRefundSnapshot(createAdminClient());
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
