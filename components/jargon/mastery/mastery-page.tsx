import type { WebStatsSnapshot } from "@/lib/jargon/collection-stats";
import type { MasteryCollectionRow } from "@/lib/jargon/mastery";
import { MasteryOverview } from "./mastery-overview";
import { MasteryRow } from "./mastery-row";

type MasteryPageProps = {
  rows: MasteryCollectionRow[];
  stats: WebStatsSnapshot;
};

export function MasteryPage({ rows, stats }: MasteryPageProps) {
  return (
    <div className="space-y-5">
      <MasteryOverview stats={stats} />

      {rows.length > 0 ? (
        <ul className="m-0 list-none space-y-2 p-0">
          {rows.map((row) => (
            <MasteryRow key={row.domainId} row={row} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-base-content/60">
          All collections are paused. Turn one on in the app to start reviewing.
        </p>
      )}
    </div>
  );
}
