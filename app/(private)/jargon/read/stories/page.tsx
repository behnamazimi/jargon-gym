import { redirect } from "next/navigation";
import { getStoriesSetupData } from "@/lib/stories/setup";
import { hasNoCollections } from "@/lib/study/collections";
import { StoriesPage } from "@/components/jargon/read/stories/stories-page";

// Writing a story can take two model calls; this raises the Server Action
// timeout for the page's actions.
export const maxDuration = 60;

type PageProps = {
  searchParams: Promise<{ domain?: string }>;
};

export default async function JargonReadStoriesPage({ searchParams }: PageProps) {
  const { domain } = await searchParams;
  const setup = await getStoriesSetupData(domain);
  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">{setup.error}</p>;
  }

  // A story already in progress still opens; only a user with nothing to
  // read from goes to the Library.
  if (
    !setup.currentStory &&
    hasNoCollections({ active: setup.collections, paused: setup.paused })
  ) {
    redirect("/jargon");
  }

  return (
    <StoriesPage
      key={setup.collections.map((collection) => collection.id).join(",")}
      setup={setup}
    />
  );
}
