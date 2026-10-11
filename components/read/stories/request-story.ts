import type { StoryResult } from "@/lib/stories/write-story";

const OFFLINE_ERROR = "Couldn't reach Lobyas. Check your connection and try again.";
const TIMED_OUT_ERROR = "Writing the story took too long. Try again.";
const GENERIC_ERROR = "Couldn't write a story this time. Try again.";

type StoryRequest = {
  collectionId: string;
  cefrLevel: string;
  pieceLength: string;
  outline: string | null;
};

/** Asks the server for a story. Never throws, except for an abort: a request
 *  that never got an answer, or got a page instead of a result, becomes an
 *  error the user can read. */
export async function requestStory(input: StoryRequest, signal: AbortSignal): Promise<StoryResult> {
  let response: Response;
  try {
    response = await fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
  } catch (err) {
    if (signal.aborted) throw err;
    return { error: OFFLINE_ERROR, reason: "unavailable" };
  }

  const body = (await response.json().catch(() => null)) as StoryResult | null;
  if (body && ("error" in body || "story" in body)) return body;
  // The platform cut the request off before the route could answer.
  if (response.status === 504) return { error: TIMED_OUT_ERROR, reason: "unavailable" };
  return { error: GENERIC_ERROR, reason: "unavailable" };
}
