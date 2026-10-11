import { redirect } from "next/navigation";
import { z } from "zod";
import { getStoriesSetupData } from "@/lib/stories/setup";
import { hasNoCollections } from "@/lib/study/collections";
import { PromoVisit } from "@/components/promos/promo-visit";
import { StoriesPage } from "@/components/read/stories/stories-page";

type PageProps = {
  searchParams: Promise<{ collection?: string; story?: string }>;
};

export default async function ReadStoriesRoute({ searchParams }: PageProps) {
  const { collection: collectionId, story } = await searchParams;
  const storyId = z.uuid().safeParse(story).success ? story : undefined;
  const setup = await getStoriesSetupData(collectionId, storyId);
  if ("error" in setup) {
    return <p className="text-sm text-base-content/70">{setup.error}</p>;
  }

  // A story already in progress still opens; only a user with nothing to
  // read from goes to the Library.
  if (
    !setup.currentStory &&
    hasNoCollections({ active: setup.collections, paused: setup.paused })
  ) {
    redirect("/app/library");
  }

  return (
    <>
      <PromoVisit target="stories" />
      <StoriesPage
        key={`${setup.collections.map((collection) => collection.id).join(",")}:${storyId ?? ""}`}
        setup={setup}
      />
    </>
  );
}
