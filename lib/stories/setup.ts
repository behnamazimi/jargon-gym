import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { getAiAccessView } from "@/lib/llm/access";
import type { AiAccessView } from "@/lib/llm/types";
import { getNarrationAccessForUser } from "@/lib/narration/access";
import { DEFAULT_READ_OPTIONS, getReadOptions } from "@/lib/read/options";
import { listStudyCollectionState } from "@/lib/study/collections";
import type { PausedStudyCollection } from "@/lib/study/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReadEligibleCountsByDomainForUser } from "@/lib/trace-queue";
import { loadPrefs } from "./prefs";
import type { ShadowingSettings } from "./shadowing";
import { getCurrentStory, getStoryForUser, getStoryTerms } from "./repository";
import { STORY_MIN_TERMS, type Story, type StoryLevels, type StoryTerm } from "./types";

export type StoryCollection = { id: string; name: string; eligibleCount: number };

export type StoriesSetupData = {
  collections: StoryCollection[];
  paused: PausedStudyCollection[];
  initialDomainId: string | null;
  levelsByDomain: Record<string, StoryLevels>;
  ai: AiAccessView;
  narrationAccess: boolean;
  narrationHighlight: boolean;
  tapToPlay: boolean;
  /** Set while the Shadowing option is on. */
  shadowing: ShadowingSettings | null;
  /** An unread piece to open straight into, instead of the setup screen. */
  currentStory: { story: Story; terms: StoryTerm[] } | null;
};

function isEligible(collection: StoryCollection): boolean {
  return collection.eligibleCount >= STORY_MIN_TERMS;
}

function resolveInitialDomainId(
  collections: StoryCollection[],
  candidates: (string | null | undefined)[],
): string | null {
  for (const id of candidates) {
    const match = collections.find((collection) => collection.id === id);
    if (match && isEligible(match)) return match.id;
  }
  return collections.find(isEligible)?.id ?? null;
}

/** A story picked from the history, or else the newest unread one. */
async function loadStoryToOpen(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  requestedStoryId: string | undefined,
): Promise<Story | null> {
  const requested = requestedStoryId
    ? await getStoryForUser(admin, userId, requestedStoryId)
    : null;
  return requested ?? getCurrentStory(admin, userId);
}

export async function getStoriesSetupData(
  requestedDomainId?: string,
  requestedStoryId?: string,
): Promise<StoriesSetupData | { error: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: "Log in to read stories." };

  const admin = createAdminClient();
  const [collectionState, eligibleCounts, prefs, ai, narrationAccess, readOptions, unreadStory] =
    await Promise.all([
      listStudyCollectionState(auth.supabase, auth.user.id),
      getReadEligibleCountsByDomainForUser(admin, auth.user.id),
      loadPrefs(admin, auth.user.id),
      getAiAccessView(auth.supabase),
      getNarrationAccessForUser(admin, auth.user.id, "narration_story"),
      getReadOptions(auth.supabase, auth.user.id).catch((err: unknown) => {
        console.error("Failed to load Read options:", err);
        return DEFAULT_READ_OPTIONS;
      }),
      loadStoryToOpen(admin, auth.user.id, requestedStoryId).catch((err: unknown) => {
        console.error("Failed to load the current story:", err);
        return null;
      }),
    ]);

  const collections = collectionState.active.map((collection) => ({
    id: collection.id,
    name: collection.name,
    eligibleCount: eligibleCounts.get(collection.id) ?? 0,
  }));

  return {
    collections,
    paused: collectionState.paused,
    initialDomainId: resolveInitialDomainId(collections, [requestedDomainId, prefs.lastDomainId]),
    levelsByDomain: prefs.levelsByDomain,
    ai,
    narrationAccess,
    narrationHighlight: readOptions.narrationHighlight,
    tapToPlay: readOptions.tapToPlay,
    shadowing: readOptions.shadowing
      ? {
          pause: readOptions.shadowingPause,
          gap: readOptions.shadowingGap,
          repeats: readOptions.shadowingRepeats,
        }
      : null,
    currentStory: unreadStory
      ? { story: unreadStory, terms: await getStoryTerms(admin, unreadStory.termIds) }
      : null,
  };
}
