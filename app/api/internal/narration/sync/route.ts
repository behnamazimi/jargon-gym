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
    try {
      const admin = createAdminClient();
      // Recorded alongside the work, so a slow write can't eat into its time budget.
      const tick = recordWorkerTick(admin, { source: auth.source, secret: auth.secret });
      await processNarrationSyncBatch(admin);
      await sweepSupersededAudio(admin);
      await tick;
    } catch (err) {
      console.error("narration sync worker error:", err);
    }
  });

  return new NextResponse(null, { status: 202 });
}
