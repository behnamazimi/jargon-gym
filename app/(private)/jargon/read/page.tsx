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

async function buildReadQueueSeed(
  params: { termId?: string; alreadyRead?: string },
  domainId: string,
): Promise<ReadQueueSeed> {
  if (params.termId) {
    const result = await getReadTermByIdAction(params.termId, params.alreadyRead === "true");
    if (result.error) return { error: result.error, terms: [] };
    if (!result.term) return { caughtUp: true, terms: [] };
    return { terms: [result.term], revealedTermIds: result.revealed ? [result.term.id] : [] };
  }

  return getReadFeedBatchAction(domainId, []);
}

export default async function JargonReadPage({ searchParams }: PageProps) {
  const [params, setup] = await Promise.all([searchParams, getReadSetupData()]);

  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">Log in to read terms.</p>;
  }

  const domainId = resolveReadCollectionId(params.domain, setup.collections);
  const seed = await buildReadQueueSeed(params, domainId);

  if (seed.error === "Log in to continue.") {
    return <p className="text-sm text-base-content/60">Log in to read terms.</p>;
  }

  return (
    <ReadPage
      seed={seed}
      collections={setup.collections}
      domainId={domainId}
      narrationAccess={setup.narrationAccess}
    />
  );
}
