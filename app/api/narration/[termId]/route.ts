import { NextResponse } from "next/server";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
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

/** Serves a term's narration audio. Re-checks narration access itself
 *  rather than trusting the caller — same rule the old server action
 *  (getTermNarrationAction) followed. */
export async function GET(request: Request, { params }: { params: Promise<{ termId: string }> }) {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return new NextResponse(null, { status: 401 });

  const allowed = await getNarrationAccessForUser(auth.supabase, auth.user.id);
  if (!allowed) return new NextResponse(null, { status: 403 });

  const { termId } = await params;
  const result = await getOrGenerateNarration(createAdminClient(), termId);
  if (result.status !== "ready") return new NextResponse(null, { status: 404 });

  const etag = etagFor(result.contentHash);
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": CACHE_CONTROL },
    });
  }

  const audio = await downloadNarrationAudio(result.storagePath);
  return new NextResponse(new Blob([audio]), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": CACHE_CONTROL,
      ETag: etag,
    },
  });
}
