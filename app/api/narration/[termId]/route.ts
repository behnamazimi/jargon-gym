import { NextResponse } from "next/server";
import { VERIFIED_USER_HEADER } from "@/lib/auth/verified-user-header";
import { getFeatureSettings } from "@/lib/ai/feature-settings";
import { countRecentGenerations, recordUsage } from "@/lib/ai/usage";
import { getNarrationAccessForUser } from "@/lib/narration/access";
import {
  getCachedNarration,
  getOrGenerateNarration,
  markNarrationFileMissing,
} from "@/lib/narration/service";
import { downloadNarrationAudio, NarrationAudioMissingError } from "@/lib/narration/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

// `no-cache` makes the browser revalidate with the ETag (the narration's
// content hash) on every play: a cheap 304 when the term is unchanged, fresh
// audio right after an edit.
const CACHE_CONTROL = "private, no-cache";

type RouteContext = { params: Promise<{ termId: string }> };

function etagFor(contentHash: string): string {
  return `"${contentHash}"`;
}

async function userCanReadTerm(termId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("terms").select("id").eq("id", termId).maybeSingle();
  return data != null;
}

/** Trusts the proxy (lib/supabase/proxy.ts) to have verified the session and
 *  forwarded the user id. Still checks narration access and that the user can
 *  read the term, since the admin client below bypasses RLS. */
async function authorize(request: Request, termId: string): Promise<NextResponse | null> {
  const userId = request.headers.get(VERIFIED_USER_HEADER);
  if (!userId) return new NextResponse(null, { status: 401 });

  const allowed = await getNarrationAccessForUser(createAdminClient(), userId);
  if (!allowed) return new NextResponse(null, { status: 403 });

  if (!(await userCanReadTerm(termId))) return new NextResponse(null, { status: 404 });
  return null;
}

/** Serves cached audio only. It never generates, so preloading a card costs
 *  nothing; generation is an explicit POST. */
export async function GET(request: Request, { params }: RouteContext) {
  const { termId } = await params;
  const denied = await authorize(request, termId);
  if (denied) return denied;

  const admin = createAdminClient();
  const result = await getCachedNarration(admin, termId);
  if (result.status !== "ready") return new NextResponse(null, { status: 404 });

  const etag = etagFor(result.contentHash);
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": CACHE_CONTROL },
    });
  }

  const range = request.headers.get("range") ?? undefined;
  let audio;
  try {
    audio = await downloadNarrationAudio(result.storagePath, range);
  } catch (error) {
    if (error instanceof NarrationAudioMissingError) {
      console.error(error.message);
      await markNarrationFileMissing(admin, termId, result.contentHash);
      return new NextResponse(null, { status: 404 });
    }
    console.error("Narration download failed:", error);
    return new NextResponse(null, { status: 502 });
  }

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

/** True when this person has used up the term narration cap. A clip that is
 *  already cached never counts against it. */
async function overDailyCap(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const settings = await getFeatureSettings(admin, "narration_term");
  if (settings?.dailyCap == null) return false;
  return (await countRecentGenerations(admin, userId, "narration_term")) >= settings.dailyCap;
}

/** Explicit "prepare": generates the clip if it is not cached yet. Replies
 *  with JSON only; the audio itself is then fetched with GET. Only a request
 *  that actually calls the speech provider is counted, failures included. */
export async function POST(request: Request, { params }: RouteContext) {
  const { termId } = await params;
  const denied = await authorize(request, termId);
  if (denied) return denied;

  const admin = createAdminClient();
  const userId = request.headers.get(VERIFIED_USER_HEADER)!;

  const cached = await getCachedNarration(admin, termId);
  if (cached.status === "ready") return NextResponse.json({ ready: true });

  if (await overDailyCap(admin, userId)) {
    return NextResponse.json({ ready: false, capped: true }, { status: 429 });
  }

  const result = await getOrGenerateNarration(admin, termId);
  if (result.generation) {
    await recordUsage(admin, {
      userId,
      feature: "narration_term",
      units: result.generation.units,
      outcome: result.status === "ready" ? "ok" : "failed",
    });
  }
  if (result.status !== "ready") return NextResponse.json({ ready: false }, { status: 502 });
  return NextResponse.json({ ready: true });
}
