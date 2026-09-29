import { after } from "next/server";
import { NextResponse } from "next/server";
import { sweepSupersededAudio } from "@/lib/ai/speech/sweep";
import { authenticateNarrationSyncRequest } from "@/lib/narration/sync-auth";
import { processNarrationSyncBatch } from "@/lib/narration/sync";
import { recordWorkerTick } from "@/lib/narration/worker-status";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = authenticateNarrationSyncRequest(request);
  if (auth.error) return auth.error;

  after(async () => {
    const admin = createAdminClient();
    // Recorded alongside the work, so a slow write can't eat into its time budget.
    const tick = recordWorkerTick(admin, { source: auth.source, secret: auth.secret });
    try {
      await processNarrationSyncBatch(admin);
    } catch (err) {
      console.error("narration sync worker error:", err);
    }
    try {
      await sweepSupersededAudio(admin);
    } catch (err) {
      console.error("audio sweep error:", err);
    }
    await tick;
  });

  return new NextResponse(null, { status: 202 });
}
