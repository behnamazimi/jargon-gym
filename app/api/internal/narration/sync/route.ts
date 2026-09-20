import { after } from "next/server";
import { NextResponse } from "next/server";
import { authenticateInternalApiRequest } from "@/lib/auth/internal-api";
import { continueNarrationSyncChain, processNarrationSyncTick } from "@/lib/narration/sync";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = authenticateInternalApiRequest(request);
  if ("error" in auth) return auth.error;

  after(async () => {
    try {
      const { shouldContinue } = await processNarrationSyncTick(createAdminClient());
      if (shouldContinue) await continueNarrationSyncChain();
    } catch (err) {
      console.error("narration sync worker error:", err);
    }
  });

  return new NextResponse(null, { status: 202 });
}
