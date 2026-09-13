import { ReviewPage } from "@/components/jargon/review/review-page";
import {
  getReviewPoolStatsAction,
  getReviewSetupData,
} from "@/app/(private)/jargon/review/actions";
import type { StudyCollection } from "@/lib/study/types";
import type { PoolStats } from "@/lib/trace-queue";

type PageProps = {
  searchParams: Promise<{ domain?: string }>;
};

function resolveReviewCollectionId(
  domainParam: string | undefined,
  collections: StudyCollection[],
): string {
  if (domainParam && collections.some((collection) => collection.id === domainParam)) {
    return domainParam;
  }
  return "all";
}

export default async function JargonReviewPage({ searchParams }: PageProps) {
  const [params, setup] = await Promise.all([searchParams, getReviewSetupData()]);

  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">{setup.error}</p>;
  }

  const domainId = resolveReviewCollectionId(params.domain, setup.collections);
  let initialPoolStats: PoolStats | null = null;
  if (setup.collections.length > 0) {
    const domainIds = domainId === "all" ? "all" : [domainId];
    const statsResult = await getReviewPoolStatsAction(domainIds);
    if ("poolStats" in statsResult && statsResult.poolStats) {
      initialPoolStats = statsResult.poolStats;
    }
  }

  return (
    <ReviewPage
      collections={setup.collections}
      initialDomainId={domainId}
      initialPoolStats={initialPoolStats}
      narrationAccess={setup.narrationAccess}
    />
  );
}
