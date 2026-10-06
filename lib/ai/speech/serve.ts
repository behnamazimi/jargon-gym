import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getReadyAudio } from "./audio";
import { markFileMissing } from "./jobs";
import { AudioMissingError, downloadAudio } from "./storage";
import type { AudioJob, SpeechSubject } from "./types";

type Client = SupabaseClient<Database>;

// `no-cache` makes the browser revalidate with the ETag (the job id) on every
// play: a cheap 304 while the clip is unchanged, the new clip right after it
// is replaced.
const REVALIDATE = "private, no-cache";

// A clip asked for by its job id never changes, so the browser may keep it for
// a day without asking. Access changes still bite once the day is up.
const VERSIONED = "private, max-age=86400, immutable";

// A miss must never be cached: the clip may be prepared a moment later.
const NEVER_CACHE = "no-store";

function missing(status: 404 | 502) {
  return new NextResponse(null, { status, headers: { "Cache-Control": NEVER_CACHE } });
}

function matchesEtag(header: string | null, etag: string): boolean {
  if (!header) return false;
  return header.split(",").some((candidate) => candidate.trim().replace(/^W\//, "") === etag);
}

/** Streams a clip, with ETag, 304 and Range support. A job whose file is gone
 *  is failed here, so the next prepare makes a new one. `versioned` is for a
 *  request that named the job by id: its bytes are immutable, so the response
 *  may be cached. The caller has already checked access. */
export async function serveJob(
  request: Request,
  admin: Client,
  job: Pick<AudioJob, "id" | "storage_path">,
  { versioned }: { versioned: boolean },
): Promise<NextResponse> {
  if (!job.storage_path) return missing(404);
  const cacheControl = versioned ? VERSIONED : REVALIDATE;

  const etag = `"${job.id}"`;
  if (matchesEtag(request.headers.get("if-none-match"), etag)) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": cacheControl },
    });
  }

  const range = request.headers.get("range") ?? undefined;
  let audio;
  try {
    audio = await downloadAudio(job.storage_path, range);
  } catch (error) {
    if (error instanceof AudioMissingError) {
      console.error(error.message);
      await markFileMissing(admin, job.id);
      return missing(404);
    }
    console.error("Audio download failed:", error);
    return missing(502);
  }

  const headers: HeadersInit = {
    "Content-Type": "audio/mpeg",
    "Cache-Control": cacheControl,
    "Accept-Ranges": "bytes",
    ETag: etag,
  };
  if (audio.contentLength !== undefined) headers["Content-Length"] = String(audio.contentLength);
  if (audio.contentRange) headers["Content-Range"] = audio.contentRange;

  return new NextResponse(audio.stream, { status: audio.partial ? 206 : 200, headers });
}

/** Serves the subject's current clip. It never generates: a missing or
 *  outdated clip is a 404 and the caller prepares it with an explicit POST. */
export async function serveAudio(
  request: Request,
  admin: Client,
  subject: SpeechSubject,
): Promise<NextResponse> {
  const job = await getReadyAudio(admin, subject);
  if (!job?.storage_path) return missing(404);
  return serveJob(request, admin, job, { versioned: false });
}
