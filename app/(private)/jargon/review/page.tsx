import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ReviewPage } from "@/components/jargon/review/review-page";
import {
  parseReviewCollectionCookie,
  REVIEW_COLLECTION_COOKIE,
} from "@/lib/review/collection-preference";
import { loadReviewFeed, loadReviewSetup } from "@/lib/review/feed";
import {
  isCollectionPreference,
  resolveStudyCollectionId,
} from "@/lib/study/collection-preference";
import { hasNoCollections } from "@/lib/study/collections";

type PageProps = {
  searchParams: Promise<{ domain?: string }>;
};

function LoginPrompt({ message }: { message: string }) {
  return <p className="text-sm text-base-content/60">{message}</p>;
}

export default async function JargonReviewPage({ searchParams }: PageProps) {
  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);
  const rememberedId = parseReviewCollectionCookie(
    cookieStore.get(REVIEW_COLLECTION_COOKIE)?.value,
  );
  const speculativeDomainId = isCollectionPreference(params.domain)
    ? params.domain
    : (rememberedId ?? "all");

  const [setup, speculativeSeed] = await Promise.all([
    loadReviewSetup(),
    loadReviewFeed(speculativeDomainId, []),
  ]);

  if ("error" in setup) {
    return <LoginPrompt message={setup.error ?? "Log in to review terms."} />;
  }
  if (hasNoCollections({ active: setup.collections, paused: setup.paused })) redirect("/jargon");

  const domainId = resolveStudyCollectionId(
    params.domain,
    rememberedId,
    setup.collections.map((collection) => collection.id),
  );
  const seed =
    domainId === speculativeDomainId ? speculativeSeed : await loadReviewFeed(domainId, []);

  if (seed.error === "Log in to continue.") {
    return <LoginPrompt message={seed.error} />;
  }

  return (
    <ReviewPage
      // Resuming a paused collection refreshes the page; a new active set
      // remounts it so the queue rebuilds from the fresh seed.
      key={setup.collections.map((collection) => collection.id).join(",")}
      seed={seed}
      collections={setup.collections}
      paused={setup.paused}
      domainId={domainId}
      narrationAccess={setup.narrationAccess}
      canEvaluateTerms={setup.canEvaluateTerms}
    />
  );
}
