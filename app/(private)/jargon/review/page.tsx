import { HintPopover } from "@/components/jargon/hint-popover";
import { ReviewPage } from "@/components/jargon/review/review-page";
import { getReviewSetupData } from "@/app/(private)/jargon/review/actions";
import { loadStudyHints } from "@/lib/hints/load-study-hints";
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
  const [params, setup, hints] = await Promise.all([
    searchParams,
    getReviewSetupData(),
    loadStudyHints(),
  ]);

  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">{setup.error}</p>;
  }

  const domainId = resolveReviewCollectionId(params.domain, setup.collections);

  return (
    <>
      <ReviewPage collections={setup.collections} initialDomainId={domainId} />
      {hints.length > 0 ? <HintPopover hints={hints} /> : null}
    </>
  );
}
