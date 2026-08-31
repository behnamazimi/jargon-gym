import { ReviewPage } from "@/components/jargon/review/review-page";
import { getReviewSetupData } from "@/app/(private)/jargon/review/actions";
import type { StudyCollection } from "@/lib/study/types";

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

  return <ReviewPage collections={setup.collections} initialDomainId={domainId} />;
}
