import { NextResponse } from "next/server";
import { z } from "zod";
import { VERIFIED_USER_HEADER } from "@/lib/auth/verified-user-header";
import { getNarrationAccessForUser } from "@/lib/narration/access";
import { downloadNarrationAudio } from "@/lib/narration/storage";
import { getOrGenerateStoryNarration } from "@/lib/stories/narration";
import { createAdminClient } from "@/lib/supabase/admin";

// The first play synthesizes the audio inside this request.
export const maxDuration = 60;

// A story's audio never changes once made, so the story id is a stable ETag.
const CACHE_CONTROL = "private, max-age=86400";

/** Serves a story's narration, generating it on the first play. Trusts the
 *  proxy-verified user header like app/api/narration/[termId]/route.ts, and
 *  re-checks narration access and story ownership itself.
 *  202 = another request is still generating it, 429 = daily cap reached.
 *  `?prepare=1` answers 204 once the audio is ready instead of streaming it,
 *  so the player can wait for it before pointing an <audio> element here. */
export async function GET(request: Request, { params }: { params: Promise<{ storyId: string }> }) {
  const userId = request.headers.get(VERIFIED_USER_HEADER);
  if (!userId) return new NextResponse(null, { status: 401 });

  const { storyId } = await params;
  if (!z.uuid().safeParse(storyId).success) return new NextResponse(null, { status: 404 });

  const admin = createAdminClient();
  const allowed = await getNarrationAccessForUser(admin, userId);
  if (!allowed) return new NextResponse(null, { status: 403 });

  const result = await getOrGenerateStoryNarration(admin, userId, storyId);
  if (result.status === "pending") return new NextResponse(null, { status: 202 });
  if (result.status === "capped") return new NextResponse(null, { status: 429 });
  if (result.status !== "ready") return new NextResponse(null, { status: 404 });
  if (new URL(request.url).searchParams.has("prepare")) {
    return new NextResponse(null, { status: 204 });
  }

  const etag = `"${storyId}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": CACHE_CONTROL },
    });
  }

  const range = request.headers.get("range") ?? undefined;
  const audio = await downloadNarrationAudio(result.storagePath, range);

  const headers: HeadersInit = {
    "Content-Type": "audio/mpeg",
    "Cache-Control": CACHE_CONTROL,
    "Accept-Ranges": "bytes",
    ETag: etag,
  };
  if (audio.contentLength !== undefined) headers["Content-Length"] = String(audio.contentLength);
  if (audio.contentRange) headers["Content-Range"] = audio.contentRange;

  return new NextResponse(audio.stream, {
    status: audio.partial ? 206 : 200,
    headers,
  });
}
