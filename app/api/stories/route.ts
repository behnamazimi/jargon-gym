import { NextResponse } from "next/server";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import type { AiFailureReason } from "@/lib/llm/types";
import { writeStory } from "@/lib/stories/write-story";

// Writing a story can take two model calls.
export const maxDuration = 60;

const STATUS_BY_REASON: Record<AiFailureReason, number> = {
  "no-ai": 403,
  "feature-off": 403,
  credits: 402,
  busy: 409,
  unavailable: 502,
};

/** Writes a story. A route rather than a Server Action: the browser runs
 *  Server Actions one at a time, so a minute-long story would hold up every
 *  other action on the page (the streak modal, votes, history). The body is
 *  always a `StoryResult`; the status only mirrors it. */
export async function POST(request: Request) {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  const input: unknown = await request.json().catch(() => null);
  const result = await writeStory(auth, input);
  if (!("error" in result)) return NextResponse.json(result);
  const status = result.reason ? STATUS_BY_REASON[result.reason] : 400;
  return NextResponse.json(result, { status });
}
