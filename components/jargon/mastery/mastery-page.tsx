import type { WebStatsSnapshot } from "@/lib/jargon/collection-stats";
import type { MasteryCollectionOption, MasteryTermRow } from "@/lib/jargon/mastery";
import { MasteryOverview } from "./mastery-overview";
import { MasteryTermList } from "./mastery-term-list";

type MasteryPageProps = {
  collections: MasteryCollectionOption[];
  stats: WebStatsSnapshot;
  currentStrength: number;
  termsLearned: number;
  termRows: MasteryTermRow[];
};

export function MasteryPage({
  collections,
  stats,
  currentStrength,
  termsLearned,
  termRows,
}: MasteryPageProps) {
  return (
    <div className="space-y-5">
      <MasteryOverview
        stats={stats}
        currentStrength={currentStrength}
        termsLearned={termsLearned}
      />

      <MasteryTermList
        termRows={termRows}
        collections={collections.map((c) => ({ id: c.domainId, name: c.domainName }))}
      />
    </div>
  );
}
