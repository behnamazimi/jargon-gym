import type { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/admin/list-params";
import type { Database } from "@/lib/supabase/database.types";

const SHARED_LINK_PATH = /^\/c\/([^/]+)$/;

type SharedLinkCheck = { kind: "redirect"; to: string } | { kind: "gone" } | null;

/** A shared link that stopped working gets a real 404, and a built-in's link a
 *  real redirect to its public page. Checked here because the page streams,
 *  and a streamed page can no longer change its status. Only page loads are
 *  checked: a Server Action posted from the page checks access itself. */
export async function checkSharedLink(
  supabase: ReturnType<typeof createServerClient<Database>>,
  request: NextRequest,
  pathname: string,
): Promise<SharedLinkCheck> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const collectionId = SHARED_LINK_PATH.exec(pathname)?.[1];
  if (!collectionId) return null;
  if (!isUuid(collectionId)) return { kind: "gone" };

  const { data, error } = await supabase.rpc("shared_collection_link", {
    p_collection_id: collectionId,
  });
  // The page checks again, so a failed lookup just lets it through.
  if (error) return null;
  if (!data) return { kind: "gone" };

  const publicSlug = (data as { public_slug: string | null }).public_slug;
  return publicSlug ? { kind: "redirect", to: `/collections/${publicSlug}` } : null;
}

/** Hands the request on, or for a dead shared link renders the 404 page instead. */
export function forward(request: NextRequest, headers: Headers, sharedLinkGone: boolean) {
  if (!sharedLinkGone) return NextResponse.next({ request: { headers } });
  // An unmatched path under the same prefix, so the 404 page gets the same chrome.
  const notFound = new URL(`${request.nextUrl.pathname}/not-found`, request.url);
  return NextResponse.rewrite(notFound, { status: 404, request: { headers } });
}
