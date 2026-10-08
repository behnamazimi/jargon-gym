import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAudio } from "@/lib/ai/speech/audio";
import { getReadyJobById } from "@/lib/ai/speech/jobs";
import { serveAudio, serveJob } from "@/lib/ai/speech/serve";
import { storyWithinDailyCap } from "@/lib/ai/speech/story-cap";
import { loadStorySubject } from "@/lib/ai/speech/subjects";
import { recordUsage } from "@/lib/ai/usage";
import { readVerifiedUser } from "@/lib/auth/verified-user-header";
import { getNarrationAccessForUser } from "@/lib/narration/access";
import { chargeStoryNarration } from "@/lib/stories/narration-billing";
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
 *  prepares it with a POST first. With `?v=<job id>` it serves that exact clip,
 *  which never changes, so the browser may keep it for a day. */
export async function GET(request: Request, { params }: RouteContext) {
  const auth = await authorize(request, params);
  if (auth.denied) return auth.denied;

  const version = new URL(request.url).searchParams.get("v");
  if (version !== null) {
    const job = z.uuid().safeParse(version).success
      ? await getReadyJobById(auth.admin, auth.subject, version)
      : null;
    if (!job || job.user_id !== auth.userId) {
      return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    return serveJob(request, auth.admin, job, { versioned: true });
  }

  return serveAudio(request, auth.admin, auth.subject);
}

/** Explicit "prepare": makes the audio if it does not exist yet. Whoever starts
 *  a clip pays for it in credits; a clip that exists or is being made is free.
 *  200 = ready, 202 = another request is still making it, 402 = not enough
 *  credits, 429 = daily cap. */
export async function POST(request: Request, { params }: RouteContext) {
  const auth = await authorize(request, params);
  if (auth.denied) return auth.denied;
  const { admin, userId, subject } = auth;

  const result = await getOrCreateAudio(admin, subject, {
    allowGeneration: () => storyWithinDailyCap(admin, userId),
    beforeGenerate: chargeStoryNarration(admin, userId),
  });
  if (result.status === "insufficient") {
    return NextResponse.json({ ready: false, insufficient: true }, { status: 402 });
  }
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
  return NextResponse.json({ ready: true, version: result.job.id });
}
