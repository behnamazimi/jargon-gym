const STORIES_PATH = "/jargon/read/stories";

// Params that only mean something on Cards and aren't carried to Stories.
const CARDS_ONLY_PARAMS = new Set(["view", "termId", "alreadyRead"]);

/** Where a plain visit to /jargon/read should go instead of Cards, or null to
 *  stay. Stories wins when the user made it the default or has a story in
 *  progress; an explicit `view=cards` or a single-term link always stays. */
export function readLandingRedirect(input: {
  params: Record<string, string | undefined>;
  storiesDefault: boolean;
  hasCurrentStory: boolean;
}): string | null {
  const { params } = input;
  if (params.view === "cards" || params.termId) return null;
  if (!input.storiesDefault && !input.hasCurrentStory) return null;

  const carried = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && !CARDS_ONLY_PARAMS.has(key)) carried.set(key, value);
  }
  const query = carried.toString();
  return query ? `${STORIES_PATH}?${query}` : STORIES_PATH;
}
