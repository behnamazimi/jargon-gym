import { ReviewPage } from "@/components/jargon/review/review-page";
import { getReviewSetupData } from "@/app/(private)/jargon/review/actions";
import { createClient } from "@/lib/supabase/server";

export default async function JargonReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <p className="text-sm text-base-content/60">Log in to review terms.</p>
      </div>
    );
  }

  const setup = await getReviewSetupData();

  if ("error" in setup) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <p className="text-sm text-base-content/60">{setup.error}</p>
      </div>
    );
  }

  return <ReviewPage collections={setup.collections} />;
}
