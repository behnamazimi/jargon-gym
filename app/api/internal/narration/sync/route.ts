import { after } from "next/server";
import { NextResponse } from "next/server";
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
    await recordWorkerTick(admin, { source: auth.source, secret: auth.secret });
    try {
      await processNarrationSyncBatch(admin);
    } catch (err) {
      console.error("narration sync worker error:", err);
    }
  });

  return new NextResponse(null, { status: 202 });
}
