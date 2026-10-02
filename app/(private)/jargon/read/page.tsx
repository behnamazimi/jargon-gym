import {
  getReadFeedBatchAction,
  getReadSetupData,
  getReadTermByIdAction,
  type ReadQueueSeed,
} from "@/app/(private)/jargon/read/actions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { QuizPanel } from "@/components/jargon/quiz/quiz-ui";
import { ReadPage } from "@/components/jargon/read/read-page";
import { StudyNoActiveCollectionsState } from "@/components/jargon/study/study-paused-state";
import { getSessionUser } from "@/lib/auth/require-session";
import { DEFAULT_READ_OPTIONS, getReadOptions, type ReadOptions } from "@/lib/read/options";
import {
  parseReadCollectionCookie,
  READ_COLLECTION_COOKIE,
} from "@/lib/read/collection-preference";
import { readLandingRedirect } from "@/lib/read/landing";
import { hasCurrentStory } from "@/lib/stories/repository";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveStudyCollectionId } from "@/lib/study/collection-preference";
import { hasNoCollections } from "@/lib/study/collections";
import type { StudyCollection } from "@/lib/study/types";

// Narration generation (ElevenLabs) can take longer than the platform's
// default Server Action timeout on a cache miss.
export const maxDuration = 60;

type PageProps = {
  searchParams: Promise<{
    termId?: string;
    alreadyRead?: string;
    domain?: string;
    view?: string;
    [key: string]: string | undefined;
  }>;
};

/** Options and "is a story in progress" for the landing redirect. Both fall
 *  back safely, so a failure here never takes Cards down with it. */
async function loadLandingState(): Promise<{ options: ReadOptions; hasStory: boolean }> {
  const { supabase, user } = await getSessionUser();
  if (!user) return { options: DEFAULT_READ_OPTIONS, hasStory: false };
  const [options, hasStory] = await Promise.all([
    getReadOptions(supabase, user.id).catch((err: unknown) => {
      console.error("Failed to load Read options:", err);
      return DEFAULT_READ_OPTIONS;
    }),
    hasCurrentStory(createAdminClient(), user.id).catch((err: unknown) => {
      console.error("Failed to check for a current story:", err);
      return false;
    }),
  ]);
  return { options, hasStory };
}

function resolveReadCollectionId(
  domainParam: string | undefined,
  collections: StudyCollection[],
): string {
  if (domainParam && collections.some((collection) => collection.id === domainParam)) {
    return domainParam;
  }
  return "all";
}

async function buildDeepLinkSeed(termId: string, alreadyRead: boolean): Promise<ReadQueueSeed> {
  const result = await getReadTermByIdAction(termId, alreadyRead);
  if (result.error) return { error: result.error, terms: [] };
  if (!result.term) return { caughtUp: true, terms: [] };
  return { terms: [result.term], revealedTermIds: result.revealed ? [result.term.id] : [] };
}

function activeCollectionsKey(collections: StudyCollection[]): string {
  return collections.map((collection) => collection.id).join(",");
}

function LoginPrompt() {
  return <p className="text-sm text-base-content/70">Log in to read terms.</p>;
}

export default async function JargonReadPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const { options, hasStory } = await loadLandingState();

  if (params.termId) {
    const setup = await getReadSetupData();
    if ("error" in setup) return <LoginPrompt />;

    const domainId = resolveReadCollectionId(params.domain, setup.collections);
    const seed = await buildDeepLinkSeed(params.termId, params.alreadyRead === "true");
    if (seed.error === "Log in to continue.") return <LoginPrompt />;

    return (
      <ReadPage
        key={activeCollectionsKey(setup.collections)}
        seed={seed}
        collections={setup.collections}
        domainId={domainId}
        narrationAccess={setup.narrationAccess}
        options={options}
      />
    );
  }

  const storiesPath = readLandingRedirect({
    params,
    storiesDefault: options.storiesDefault,
    hasCurrentStory: hasStory,
  });
  if (storiesPath) redirect(storiesPath);

  // No deep link: the domain is already resolvable from the URL (or
  // defaults to "all"), so fire the feed batch next to setup instead of
  // waiting for setup to resolve first — getReadFeedBatchAction does its
  // own auth check and an unknown/inactive domain id just yields an empty
  // pick. Only discard it if the resolved domain turns out different (a
  // stale/removed collection in the URL).
  const rememberedId = parseReadCollectionCookie(
    (await cookies()).get(READ_COLLECTION_COOKIE)?.value,
  );
  const speculativeDomainId = params.domain ?? rememberedId ?? "all";
  const [setup, speculativeSeed] = await Promise.all([
    getReadSetupData(),
    getReadFeedBatchAction(speculativeDomainId, []),
  ]);
  if ("error" in setup) return <LoginPrompt />;
  if (hasNoCollections({ active: setup.collections, paused: setup.paused })) redirect("/jargon");
  if (setup.collections.length === 0) {
    return (
      <QuizPanel className="flex max-h-full min-h-0 w-full flex-col">
        <StudyNoActiveCollectionsState paused={setup.paused} activity="reading" />
      </QuizPanel>
    );
  }

  const domainId = resolveStudyCollectionId(
    params.domain,
    rememberedId,
    setup.collections.map((collection) => collection.id),
  );
  const seed =
    domainId === speculativeDomainId ? speculativeSeed : await getReadFeedBatchAction(domainId, []);
  if (seed.error === "Log in to continue.") return <LoginPrompt />;

  return (
    <ReadPage
      key={activeCollectionsKey(setup.collections)}
      seed={seed}
      collections={setup.collections}
      domainId={domainId}
      narrationAccess={setup.narrationAccess}
      options={options}
    />
  );
}
