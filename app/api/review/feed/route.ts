import { NextResponse } from "next/server";
import { loadReviewFeed, parseReviewFeedRequest } from "@/lib/review/feed";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Refills the Review queue. A Route Handler rather than a Server Action:
 *  actions run one at a time per client, so a refill would wait behind the
 *  reveal and grade writes. POST because the exclude list is too long for a URL. */
export async function POST(request: Request) {
  const input = parseReviewFeedRequest(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json(
      { error: "Invalid request.", terms: [] },
      { status: 400, headers: NO_STORE },
    );
  }

  const seed = await loadReviewFeed(input.domainId, input.excludeTermIds);
  return NextResponse.json(seed, { headers: NO_STORE });
}
