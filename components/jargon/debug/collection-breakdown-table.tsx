import type { CollectionStat } from "./stats-strip-helpers";

export function CollectionBreakdownTable({ stats }: { stats: CollectionStat[] }) {
  if (stats.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="m-0 text-sm font-semibold">By collection</h3>
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Collection</th>
              <th>Total</th>
              <th>Known</th>
              <th>Learning</th>
              <th>Unknown</th>
              <th>Flagged</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat) => (
              <tr key={stat.domainId}>
                <td>{stat.name}</td>
                <td className="tabular-nums">{stat.total}</td>
                <td className="tabular-nums text-success">{stat.known}</td>
                <td className="tabular-nums text-warning">{stat.learning}</td>
                <td className="tabular-nums text-base-content/70">{stat.unknown}</td>
                <td className="tabular-nums text-error">{stat.flagged}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
