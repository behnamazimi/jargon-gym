import { Signal } from "lucide-react";
import { getMasterySetupData } from "@/app/(private)/app/mastery/actions";
import { MasteryPage } from "@/components/mastery/mastery-page";
import { EmptyState } from "@/components/shared/empty-state";
import { PageCenter } from "@/components/page-container";
import { LinkButton } from "@/components/ui/button";

type PageProps = {
  searchParams: Promise<{ tab?: string; collection?: string }>;
};

export default async function MasteryRoute({ searchParams }: PageProps) {
  const [params, setup] = await Promise.all([searchParams, getMasterySetupData()]);

  if ("error" in setup) {
    return (
      <PageCenter>
        <p className="text-sm text-base-content/70">{setup.error}</p>
      </PageCenter>
    );
  }

  const { collections, termsLearning, termsLearned, stats } = setup;

  if (stats.activeCount === 0 && stats.pausedCount === 0) {
    return (
      <EmptyState
        icon={Signal}
        title="No collections yet"
        description="Add your own terms or a collection to see your mastery overview here."
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <LinkButton href="/app/browse">Browse collections</LinkButton>
          <LinkButton href="/app/import" variant="outline">
            Add your own terms
          </LinkButton>
        </div>
      </EmptyState>
    );
  }

  return (
    <MasteryPage
      initialTab={params.tab === "terms" ? "terms" : "overview"}
      initialCollectionId={
        collections.some((collection) => collection.collectionId === params.collection)
          ? (params.collection ?? "all")
          : "all"
      }
      collections={collections}
      stats={stats}
      termsLearning={termsLearning}
      termsLearned={termsLearned}
    />
  );
}
