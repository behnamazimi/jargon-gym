import { NextResponse } from "next/server";
import { VERIFIED_USER_HEADER } from "@/lib/auth/verified-user-header";
import { getNarrationAccessForUser } from "@/lib/narration/access";
import { getOrGenerateNarration } from "@/lib/narration/service";
import { downloadNarrationAudio } from "@/lib/narration/storage";
import { createAdminClient } from "@/lib/supabase/admin";

// A day is a generous but bounded window; the ETag (the narration's content
// hash) is what actually keeps this correct — a revalidation request gets a
// fresh copy immediately if the term's narrated fields changed, or a cheap
// 304 if they didn't. This lets the browser's own HTTP cache do the work
// instead of any bespoke client-side caching.
const CACHE_CONTROL = "private, max-age=86400";

function etagFor(contentHash: string): string {
  return `"${contentHash}"`;
}

/** Serves a term's narration audio. Trusts the proxy (lib/supabase/proxy.ts)
 *  to have already verified the session via supabase.auth.getUser() and
 *  forwarded the user id — that verification is unspoofable (the proxy
 *  always overwrites the header, never merges), so this route doesn't need
 *  to re-verify. It still re-checks narration *access* itself (the allowlist
 *  RPC), same rule the old server action (getTermNarrationAction) followed. */
export async function GET(request: Request, { params }: { params: Promise<{ termId: string }> }) {
  const userId = request.headers.get(VERIFIED_USER_HEADER);
  if (!userId) return new NextResponse(null, { status: 401 });

  const admin = createAdminClient();
  const allowed = await getNarrationAccessForUser(admin, userId);
  if (!allowed) return new NextResponse(null, { status: 403 });

  const { termId } = await params;
  const result = await getOrGenerateNarration(admin, termId);
  if (result.status !== "ready") return new NextResponse(null, { status: 404 });

  const etag = etagFor(result.contentHash);
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
