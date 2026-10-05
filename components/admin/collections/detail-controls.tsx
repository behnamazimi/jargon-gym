"use client";

import { useState } from "react";
import { EditUrlDialog } from "@/components/admin/collections/edit-url-dialog";
import { KindSelect } from "@/components/admin/collections/kind-select";
import { StatusSelect } from "@/components/admin/collections/status-select";
import { statusOf } from "@/lib/admin/collections/collection-status";
import { kindLabel } from "@/lib/terms/kinds";
import type { AdminCollectionRow } from "@/lib/admin/collections/list-all-collections";

const STATUS_LABEL = {
  none: "Not built-in",
  builtin: "Built-in",
  published: "Published",
} as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-base-content">{label}</span>
      {children}
    </div>
  );
}

export function CollectionDetailControls({ collection }: { collection: AdminCollectionRow }) {
  const [editing, setEditing] = useState(false);
  const canEditUrl = !collection.readOnly && (collection.isBuiltin || Boolean(collection.slug));

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Status">
        {collection.readOnly ? (
          <span className="text-base-content/65">{STATUS_LABEL[statusOf(collection)]}</span>
        ) : (
          <StatusSelect collection={collection} />
        )}
      </Field>
      <Field label="Kind">
        {collection.readOnly ? (
          <span className="text-base-content/65">{kindLabel(collection.kind)}</span>
        ) : (
          <KindSelect collection={collection} />
        )}
      </Field>
      <Field label="Public address">
        <span className="text-base-content/65">
          {collection.slug ? `/collections/${collection.slug}` : "—"}
        </span>
        {canEditUrl ? (
          <>
            <button
              type="button"
              className="btn btn-ghost btn-xs w-fit"
              onClick={() => setEditing(true)}
            >
              Edit URL
            </button>
            {editing ? (
              <EditUrlDialog collection={collection} onClose={() => setEditing(false)} />
            ) : null}
          </>
        ) : null}
      </Field>
    </div>
  );
}
