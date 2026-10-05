import { CollectionRow } from "@/components/admin/collections/collection-row";
import type { AdminCollectionRow } from "@/lib/admin/collections/list-all-collections";
import { DEFAULT_NARRATION_MODE, type NarrationMode } from "@/lib/narration/mode";

export function CollectionsTable({
  rows,
  narrationModes,
}: {
  rows: AdminCollectionRow[];
  narrationModes: Map<string, NarrationMode>;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-base-300">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Owner</th>
            <th>Terms</th>
            <th>Loves</th>
            <th>Kind</th>
            <th>Status</th>
            <th>Address</th>
            <th>Narration</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((collection) => (
            <CollectionRow
              key={collection.id}
              collection={collection}
              narrationMode={narrationModes.get(collection.id) ?? DEFAULT_NARRATION_MODE}
            />
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="text-center text-base-content/50">
                No collections here.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
