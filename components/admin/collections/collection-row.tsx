"use client";

import Link from "next/link";
import { useState } from "react";
import { EditUrlDialog } from "@/components/admin/collections/edit-url-dialog";
import { StatusSelect } from "@/components/admin/collections/status-select";
import { formatAdminDate } from "@/lib/admin/format";
import { statusOf } from "@/lib/jargon/admin/collection-status";
import type { AdminCollectionRow } from "@/lib/jargon/admin/list-all-collections";

const STATUS_LABEL = { none: "Not built-in", builtin: "Built-in", published: "Published" } as const;

export function CollectionRow({ collection }: { collection: AdminCollectionRow }) {
  const [editing, setEditing] = useState(false);
  const canEditUrl = !collection.readOnly && (collection.isBuiltin || Boolean(collection.slug));

  return (
    <tr>
      <td className="font-medium text-base-content">
        {collection.isPublic && collection.slug ? (
          <Link href={`/j/${collection.slug}`} className="link">
            {collection.name}
          </Link>
        ) : (
          collection.name
        )}
        {collection.visibility === "shared" ? (
          <span className="badge badge-ghost badge-sm ml-2">Shared</span>
        ) : (
          <span className="badge badge-ghost badge-sm ml-2">Private</span>
        )}
      </td>
      <td className="text-base-content/65">{collection.ownerEmail ?? "—"}</td>
      <td className="text-base-content/65">{collection.termCount}</td>
      <td>
        {collection.readOnly ? (
          <span className="text-base-content/65">{STATUS_LABEL[statusOf(collection)]}</span>
        ) : (
          <StatusSelect collection={collection} />
        )}
      </td>
      <td className="whitespace-nowrap text-base-content/65">
        {collection.slug ? `/j/${collection.slug}` : "—"}
        {canEditUrl ? (
          <>
            {" "}
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setEditing(true)}>
              Edit URL
            </button>
            {editing ? (
              <EditUrlDialog collection={collection} onClose={() => setEditing(false)} />
            ) : null}
          </>
        ) : null}
      </td>
      <td className="text-base-content/65">{formatAdminDate(collection.updatedAt)}</td>
    </tr>
  );
}
