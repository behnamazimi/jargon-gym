import { Signal } from "lucide-react";
import { getMasterySetupData } from "@/app/(private)/jargon/mastery/actions";
import { MasteryPage } from "@/components/jargon/mastery/mastery-page";
import { EmptyState } from "@/components/jargon/empty-state";
import { PageCenter } from "@/components/page-container";
import { LinkButton } from "@/components/ui/button";

export default async function JargonMasteryPage() {
  const setup = await getMasterySetupData();

  if ("error" in setup) {
    return (
      <PageCenter>
        <p className="text-sm text-base-content/60">{setup.error}</p>
      </PageCenter>
    );
  }

  const { collections, termsLearning, termsLearned, termRows, stats } = setup;

  if (stats.activeCount === 0 && stats.pausedCount === 0) {
    return (
      <EmptyState
        icon={Signal}
        title="No collections yet"
        description="Import your own terms or add a shared collection to see your mastery overview here."
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <LinkButton href="/jargon/import">Import jargon</LinkButton>
          <LinkButton href="/jargon/browse" variant="outline">
            Browse shared collections
          </LinkButton>
        </div>
      </EmptyState>
    );
  }

  return (
    <MasteryPage
      collections={collections}
      stats={stats}
      termsLearning={termsLearning}
      termsLearned={termsLearned}
      termRows={termRows}
    />
  );
}
