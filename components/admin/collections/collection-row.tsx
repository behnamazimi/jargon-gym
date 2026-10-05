import Link from "next/link";
import { ModerationBadges } from "@/components/admin/collections/moderation-cell";
import { formatAdminDate } from "@/lib/admin/format";
import { statusOf } from "@/lib/admin/collections/collection-status";
import {
  canNarrateCollection,
  type AdminCollectionRow,
} from "@/lib/admin/collections/list-all-collections";
import { kindLabel } from "@/lib/terms/kinds";
import { narrationModeLabel, type NarrationMode } from "@/lib/narration/mode";

const STATUS_LABEL = {
  none: "Not built-in",
  builtin: "Built-in",
  published: "Published",
} as const;

export function CollectionRow({
  collection,
  narrationMode,
}: {
  collection: AdminCollectionRow;
  narrationMode: NarrationMode;
}) {
  return (
    <tr>
      <td className="min-w-64 font-medium text-base-content">
        <Link href={`/admin/collections/${collection.id}`} className="link">
          {collection.name}
        </Link>
        <span className="badge badge-ghost badge-sm ml-2">
          {collection.visibility === "shared" ? "Shared" : "Private"}
        </span>
      </td>
      <td className="text-base-content/65">{collection.ownerEmail ?? "—"}</td>
      <td className="text-base-content/65">{collection.termCount}</td>
      <td className="text-base-content/65">
        {collection.visibility === "shared" ? collection.loveCount : "—"}
      </td>
      <td className="text-base-content/65">{kindLabel(collection.kind)}</td>
      <td className="text-base-content/65">
        {STATUS_LABEL[statusOf(collection)]}
        <ModerationBadges collection={collection} />
      </td>
      <td className="whitespace-nowrap text-base-content/65">
        {collection.slug ? `/collections/${collection.slug}` : "—"}
      </td>
      <td className="whitespace-nowrap text-base-content/65">
        {canNarrateCollection(collection) ? narrationModeLabel(narrationMode) : "—"}
      </td>
      <td className="text-base-content/65">{formatAdminDate(collection.updatedAt)}</td>
    </tr>
  );
}
