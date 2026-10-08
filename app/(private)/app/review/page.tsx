import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ReviewPage } from "@/components/review/review-page";
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
  searchParams: Promise<{ collection?: string }>;
};

function LoginPrompt({ message }: { message: string }) {
  return <p className="text-sm text-base-content/70">{message}</p>;
}

export default async function ReviewRoute({ searchParams }: PageProps) {
  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);
  const rememberedId = parseReviewCollectionCookie(
    cookieStore.get(REVIEW_COLLECTION_COOKIE)?.value,
  );
  const speculativeCollectionId = isCollectionPreference(params.collection)
    ? params.collection
    : (rememberedId ?? "all");

  const [setup, speculativeSeed] = await Promise.all([
    loadReviewSetup(),
    loadReviewFeed(speculativeCollectionId, []),
  ]);

  if ("error" in setup) {
    return <LoginPrompt message={setup.error ?? "Log in to review terms."} />;
  }
  if (hasNoCollections({ active: setup.collections, paused: setup.paused }))
    redirect("/app/library");

  const collectionId = resolveStudyCollectionId(
    params.collection,
    rememberedId,
    setup.collections.map((collection) => collection.id),
  );
  const seed =
    collectionId === speculativeCollectionId
      ? speculativeSeed
      : await loadReviewFeed(collectionId, []);

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
      collectionId={collectionId}
      narrationAccess={setup.narrationAccess}
    />
  );
}
