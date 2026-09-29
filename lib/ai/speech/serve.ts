import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getReadyAudio } from "./audio";
import { markFileMissing } from "./jobs";
import { AudioMissingError, downloadAudio } from "./storage";
import type { SpeechSubject } from "./types";

type Client = SupabaseClient<Database>;

// `no-cache` makes the browser revalidate with the ETag (the job id) on every
// play: a cheap 304 while the clip is unchanged, the new clip right after it
// is replaced.
const CACHE_CONTROL = "private, no-cache";

/** Streams the current clip, with ETag, 304 and Range support. It never
 *  generates: a missing or outdated clip is a 404 and the caller prepares it
 *  with an explicit POST. A clip whose file is gone is failed here, so the
 *  next prepare makes a new one. The caller has already checked access. */
export async function serveAudio(
  request: Request,
  admin: Client,
  subject: SpeechSubject,
): Promise<NextResponse> {
  const job = await getReadyAudio(admin, subject);
  if (!job?.storage_path) return new NextResponse(null, { status: 404 });

  const etag = `"${job.id}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": CACHE_CONTROL },
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
      return new NextResponse(null, { status: 404 });
    }
    console.error("Audio download failed:", error);
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

  return new NextResponse(audio.stream, { status: audio.partial ? 206 : 200, headers });
}
