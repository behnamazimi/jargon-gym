import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAudio } from "@/lib/ai/speech/audio";
import { serveAudio } from "@/lib/ai/speech/serve";
import { storyWithinDailyCap } from "@/lib/ai/speech/story-cap";
import { loadStorySubject } from "@/lib/ai/speech/subjects";
import { recordUsage } from "@/lib/ai/usage";
import { readVerifiedUser } from "@/lib/auth/verified-user-header";
import { getNarrationAccessForUser } from "@/lib/narration/access";
import { createAdminClient } from "@/lib/supabase/admin";

// Preparing a story synthesizes the audio inside the POST request.
export const maxDuration = 60;

type RouteContext = { params: Promise<{ storyId: string }> };

/** Trusts the proxy-verified user header like app/api/narration/[termId]/route.ts,
 *  and re-checks narration access and story ownership itself. */
async function authorize(request: Request, params: RouteContext["params"]) {
  const userId = (await readVerifiedUser(request.headers))?.id;
  if (!userId) return { denied: new NextResponse(null, { status: 401 }) };

  const { storyId } = await params;
  if (!z.uuid().safeParse(storyId).success) {
    return { denied: new NextResponse(null, { status: 404 }) };
  }

  const admin = createAdminClient();
  if (!(await getNarrationAccessForUser(admin, userId, "narration_story"))) {
    return { denied: new NextResponse(null, { status: 403 }) };
  }

  const subject = await loadStorySubject(admin, userId, storyId);
  if (!subject) return { denied: new NextResponse(null, { status: 404 }) };
  return { admin, userId, subject };
}

/** Serves the story's audio once it exists. It never generates: the player
 *  prepares it with a POST first. */
export async function GET(request: Request, { params }: RouteContext) {
  const auth = await authorize(request, params);
  if (auth.denied) return auth.denied;

  return serveAudio(request, auth.admin, auth.subject);
}

/** Explicit "prepare": makes the audio if it does not exist yet.
 *  200 = ready, 202 = another request is still making it, 429 = daily cap. */
export async function POST(request: Request, { params }: RouteContext) {
  const auth = await authorize(request, params);
  if (auth.denied) return auth.denied;
  const { admin, userId, subject } = auth;

  const result = await getOrCreateAudio(admin, subject, {
    allowGeneration: () => storyWithinDailyCap(admin, userId),
  });
  if (result.status === "capped") {
    return NextResponse.json({ ready: false, capped: true }, { status: 429 });
  }
  if ("generation" in result && result.generation) {
    for (const call of result.generation.calls) {
      await recordUsage(admin, { userId, feature: "narration_story", ...call });
    }
  }
  if (result.status === "pending") {
    return NextResponse.json({ ready: false, pending: true }, { status: 202 });
  }
  if (result.status !== "ready") return NextResponse.json({ ready: false }, { status: 502 });
  return NextResponse.json({ ready: true });
}
