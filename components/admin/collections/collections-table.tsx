import { CollectionRow } from "@/components/admin/collections/collection-row";
import type { AdminCollectionRow } from "@/lib/jargon/admin/list-all-collections";

export function CollectionsTable({ rows }: { rows: AdminCollectionRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-base-300">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Owner</th>
            <th>Terms</th>
            <th>Status</th>
            <th>Address</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((collection) => (
            <CollectionRow key={collection.id} collection={collection} />
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center text-base-content/50">
                No collections here.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
