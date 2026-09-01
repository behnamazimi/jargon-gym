import type { WebStatsSnapshot } from "@/lib/jargon/collection-stats";
import type { MasteryCollectionRow, MasteryTermRow } from "@/lib/jargon/mastery";
import { MasteryOverview } from "./mastery-overview";
import { MasteryTermList } from "./mastery-term-list";

type MasteryPageProps = {
  rows: MasteryCollectionRow[];
  stats: WebStatsSnapshot;
  currentStrength: number;
  termsLearned: number;
  termRows: MasteryTermRow[];
};

export function MasteryPage({
  rows,
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
        collections={rows.map((row) => ({ id: row.domainId, name: row.domainName }))}
      />
    </div>
  );
}
