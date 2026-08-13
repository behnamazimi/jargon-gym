import { ReviewPage } from "@/components/jargon/review/review-page";
import { getReviewSetupData } from "@/app/(private)/jargon/review/actions";

export default async function JargonReviewPage() {
  const setup = await getReviewSetupData();

  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">{setup.error}</p>;
  }

  return <ReviewPage collections={setup.collections} />;
}
