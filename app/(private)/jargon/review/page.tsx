import { ReviewPage } from "@/components/jargon/review/review-page";
import { getReviewSetupData } from "@/app/(private)/jargon/review/actions";

type PageProps = {
  searchParams: Promise<{ domain?: string }>;
};

export default async function JargonReviewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const setup = await getReviewSetupData(params.domain);

  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">{setup.error}</p>;
  }

  return (
    <ReviewPage
      collections={setup.collections}
      initialDomainId={setup.domainId}
      narrationAccess={setup.narrationAccess}
      initialPoolStats={setup.poolStats}
    />
  );
}
