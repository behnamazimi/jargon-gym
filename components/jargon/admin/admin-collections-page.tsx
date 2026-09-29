"use client";

import { useState } from "react";
import { setBuiltin, setPublic, updateDomainSlug } from "@/app/(private)/admin/collections/actions";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { useAdminAction } from "@/hooks/use-admin-action";
import type { AdminCollectionRow } from "@/lib/jargon/admin/list-all-collections";

export function AdminCollectionsPageClient({ collections }: { collections: AdminCollectionRow[] }) {
  return (
    <>
      <AdminPageHeader
        title="Collections"
        description="Mark collections as built-in, then publish the ones that should get a public page."
      />

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Owner</th>
              <th>Terms</th>
              <th>Visibility</th>
              <th>Built-in</th>
              <th>Public</th>
              <th>Slug</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => (
              <CollectionRow key={`${collection.id}-${collection.slug}`} collection={collection} />
            ))}
            {collections.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-base-content/50">
                  No collections yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CollectionRow({ collection }: { collection: AdminCollectionRow }) {
  const [slug, setSlug] = useState(collection.slug ?? "");
  const { run, isPending, error, clearError } = useAdminAction();

  function handleSlugBlur() {
    if (!slug.trim() || slug === collection.slug) return;
    void run(() => updateDomainSlug(collection.id, slug), {
      onSuccess: (result) => setSlug(result.slug),
    }).then((ok) => {
      if (!ok) setSlug(collection.slug ?? "");
    });
  }

  return (
    <tr>
      <td className="font-medium text-base-content">{collection.name}</td>
      <td className="text-base-content/65">{collection.ownerEmail ?? "—"}</td>
      <td className="text-base-content/65">{collection.termCount}</td>
      <td className="text-base-content/65">
        {collection.visibility === "shared" ? "Shared" : "Private"}
      </td>
      <td>
        <AdminSwitch
          size="sm"
          label={`Mark ${collection.name} as built-in`}
          value={collection.isBuiltin}
          save={(next) => setBuiltin(collection.id, next)}
          confirm={(next) =>
            !next && collection.isPublic
              ? {
                  title: "Take this collection offline?",
                  description: `${collection.name} stops being built-in, so its public page goes offline.`,
                  confirmLabel: "Take offline",
                }
              : null
          }
        />
      </td>
      <td>
        <AdminSwitch
          size="sm"
          label={`Publish ${collection.name}`}
          value={collection.isPublic}
          disabled={!collection.isBuiltin}
          save={(next) => setPublic(collection.id, next).then(dropSlug)}
          confirm={(next) =>
            next
              ? null
              : {
                  title: "Unpublish this collection?",
                  description: `The public page for ${collection.name} goes offline.`,
                  confirmLabel: "Unpublish",
                }
          }
        />
      </td>
      <td>
        {collection.isPublic ? (
          <input
            type="text"
            className="input input-sm input-bordered w-40"
            value={slug}
            disabled={isPending}
            onChange={(event) => {
              clearError();
              setSlug(event.target.value);
            }}
            onBlur={handleSlugBlur}
            aria-label={`Slug for ${collection.name}`}
          />
        ) : (
          <span className="text-base-content/40">—</span>
        )}
        {error ? <p className="mt-1 text-sm text-error">{error}</p> : null}
      </td>
    </tr>
  );
}

/** The switch only needs to know whether saving worked; the new slug arrives with the refreshed page. */
function dropSlug(result: Awaited<ReturnType<typeof setPublic>>) {
  return result.ok ? ({ ok: true, data: undefined } as const) : result;
}
