import {
  getReadFeedBatchAction,
  getReadSetupData,
  getReadTermByIdAction,
  type ReadQueueSeed,
} from "@/app/(private)/jargon/read/actions";
import { ReadPage } from "@/components/jargon/read/read-page";
import type { StudyCollection } from "@/lib/study/types";

// Narration generation (ElevenLabs) can take longer than the platform's
// default Server Action timeout on a cache miss.
export const maxDuration = 60;

type PageProps = {
  searchParams: Promise<{ termId?: string; alreadyRead?: string; domain?: string }>;
};

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

function LoginPrompt() {
  return <p className="text-sm text-base-content/60">Log in to read terms.</p>;
}

export default async function JargonReadPage({ searchParams }: PageProps) {
  const params = await searchParams;

  if (params.termId) {
    const setup = await getReadSetupData();
    if ("error" in setup) return <LoginPrompt />;

    const domainId = resolveReadCollectionId(params.domain, setup.collections);
    const seed = await buildDeepLinkSeed(params.termId, params.alreadyRead === "true");
    if (seed.error === "Log in to continue.") return <LoginPrompt />;

    return (
      <ReadPage
        seed={seed}
        collections={setup.collections}
        domainId={domainId}
        narrationAccess={setup.narrationAccess}
      />
    );
  }

  // No deep link: the domain is already resolvable from the URL (or
  // defaults to "all"), so fire the feed batch next to setup instead of
  // waiting for setup to resolve first — getReadFeedBatchAction does its
  // own auth check and an unknown/inactive domain id just yields an empty
  // pick. Only discard it if the resolved domain turns out different (a
  // stale/removed collection in the URL).
  const speculativeDomainId = params.domain ?? "all";
  const [setup, speculativeSeed] = await Promise.all([
    getReadSetupData(),
    getReadFeedBatchAction(speculativeDomainId, []),
  ]);
  if ("error" in setup) return <LoginPrompt />;

  const domainId = resolveReadCollectionId(params.domain, setup.collections);
  const seed =
    domainId === speculativeDomainId ? speculativeSeed : await getReadFeedBatchAction(domainId, []);
  if (seed.error === "Log in to continue.") return <LoginPrompt />;

  return (
    <ReadPage
      seed={seed}
      collections={setup.collections}
      domainId={domainId}
      narrationAccess={setup.narrationAccess}
    />
  );
}
