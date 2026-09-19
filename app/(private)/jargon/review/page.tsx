import { cookies } from "next/headers";
import { ReviewPage } from "@/components/jargon/review/review-page";
import {
  getReviewFeedBatchAction,
  getReviewSetupData,
} from "@/app/(private)/jargon/review/actions";
import {
  parseReviewCollectionCookie,
  REVIEW_COLLECTION_COOKIE,
} from "@/lib/review/collection-preference";
import type { StudyCollection } from "@/lib/study/types";

type PageProps = {
  searchParams: Promise<{ domain?: string }>;
};

function resolveReviewCollectionId(
  domainParam: string | undefined,
  rememberedId: string | null,
  collections: StudyCollection[],
): string {
  if (domainParam && collections.some((collection) => collection.id === domainParam)) {
    return domainParam;
  }
  if (rememberedId === "all") return "all";
  if (rememberedId && collections.some((collection) => collection.id === rememberedId)) {
    return rememberedId;
  }
  return "all";
}

function LoginPrompt({ message }: { message: string }) {
  return <p className="text-sm text-base-content/60">{message}</p>;
}

export default async function JargonReviewPage({ searchParams }: PageProps) {
  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);
  const rememberedId = parseReviewCollectionCookie(
    cookieStore.get(REVIEW_COLLECTION_COOKIE)?.value,
  );
  const speculativeDomainId = params.domain ?? rememberedId ?? "all";

  const [setup, speculativeSeed] = await Promise.all([
    getReviewSetupData(),
    getReviewFeedBatchAction(speculativeDomainId, []),
  ]);

  if ("error" in setup) {
    return <LoginPrompt message={setup.error ?? "Log in to review terms."} />;
  }

  const domainId = resolveReviewCollectionId(params.domain, rememberedId, setup.collections);
  const seed =
    domainId === speculativeDomainId
      ? speculativeSeed
      : await getReviewFeedBatchAction(domainId, []);

  if (seed.error === "Log in to continue.") {
    return <LoginPrompt message={seed.error} />;
  }

  return (
    <ReviewPage
      seed={seed}
      collections={setup.collections}
      domainId={domainId}
      narrationAccess={setup.narrationAccess}
    />
  );
}
