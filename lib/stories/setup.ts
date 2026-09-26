import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { getUserSettings } from "@/lib/llm/settings";
import { hasLlmConfigured, LLM_PROVIDER_LABELS } from "@/lib/llm/types";
import { getNarrationAccessForUser } from "@/lib/narration/access";
import { listStudyCollections } from "@/lib/study/collections";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReadEligibleCountsByDomainForUser } from "@/lib/trace-queue";
import { loadPrefs } from "./prefs";
import { getLatestUnreadStory, getStoryTerms } from "./repository";
import { STORY_MIN_TERMS, type Story, type StoryLevels, type StoryTerm } from "./types";

export type StoryCollection = { id: string; name: string; eligibleCount: number };

export type StoriesSetupData = {
  collections: StoryCollection[];
  initialDomainId: string | null;
  levelsByDomain: Record<string, StoryLevels>;
  llmConfigured: boolean;
  providerLabel: string | null;
  narrationAccess: boolean;
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

export async function getStoriesSetupData(
  requestedDomainId?: string,
): Promise<StoriesSetupData | { error: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: "Log in to read stories." };

  const admin = createAdminClient();
  const [studyCollections, eligibleCounts, prefs, settings, narrationAccess, unreadStory] =
    await Promise.all([
      listStudyCollections(auth.supabase, auth.user.id),
      getReadEligibleCountsByDomainForUser(admin, auth.user.id),
      loadPrefs(admin, auth.user.id),
      getUserSettings(auth.supabase, auth.user.id),
      getNarrationAccessForUser(auth.supabase, auth.user.id),
      getLatestUnreadStory(admin, auth.user.id),
    ]);

  const collections = studyCollections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    eligibleCount: eligibleCounts.get(collection.id) ?? 0,
  }));

  return {
    collections,
    initialDomainId: resolveInitialDomainId(collections, [requestedDomainId, prefs.lastDomainId]),
    levelsByDomain: prefs.levelsByDomain,
    llmConfigured: hasLlmConfigured(settings),
    providerLabel: settings?.provider ? LLM_PROVIDER_LABELS[settings.provider] : null,
    narrationAccess,
    currentStory: unreadStory
      ? { story: unreadStory, terms: await getStoryTerms(admin, unreadStory.termIds) }
      : null,
  };
}
