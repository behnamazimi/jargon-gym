"use client";

import { useState, useTransition } from "react";
import { setBuiltin, setPublic, updateDomainSlug } from "@/app/(private)/admin/collections/actions";
import { AdminNav } from "@/components/jargon/admin/admin-nav";
import type { AdminCollectionRow } from "@/lib/jargon/admin/list-all-collections";

type AdminCollectionsPageClientProps = {
  collections: AdminCollectionRow[];
};

export function AdminCollectionsPageClient({ collections }: AdminCollectionsPageClientProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <AdminNav />

      <div className="max-md:sr-only">
        <h1 className="text-2xl font-semibold text-base-content">Collections</h1>
        <p className="mt-1 text-base text-base-content/65">
          Mark collections as built-in, then publish the ones that should get a public page.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Owner</th>
              <th>Terms</th>
              <th>Built-in</th>
              <th>Public</th>
              <th>Slug</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => (
              <CollectionRow key={collection.id} collection={collection} />
            ))}
            {collections.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-base-content/50">
                  No collections yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CollectionRow({ collection }: { collection: AdminCollectionRow }) {
  const [isBuiltin, setIsBuiltin] = useState(collection.isBuiltin);
  const [isPublic, setIsPublic] = useState(collection.isPublic);
  const [slug, setSlug] = useState(collection.slug ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleBuiltinChange(value: boolean) {
    setError(null);
    const previousBuiltin = isBuiltin;
    const previousPublic = isPublic;
    setIsBuiltin(value);
    if (!value) setIsPublic(false);

    startTransition(async () => {
      try {
        await setBuiltin(collection.id, value);
      } catch (err) {
        setIsBuiltin(previousBuiltin);
        setIsPublic(previousPublic);
        setError(err instanceof Error ? err.message : "Failed to update.");
      }
    });
  }

  function handlePublicChange(value: boolean) {
    setError(null);
    const previous = isPublic;
    setIsPublic(value);

    startTransition(async () => {
      try {
        const result = await setPublic(collection.id, value);
        if (result.slug) setSlug(result.slug);
      } catch (err) {
        setIsPublic(previous);
        setError(err instanceof Error ? err.message : "Failed to update.");
      }
    });
  }

  function handleSlugBlur() {
    if (!slug.trim() || slug === collection.slug) return;
    setError(null);

    startTransition(async () => {
      try {
        const result = await updateDomainSlug(collection.id, slug);
        setSlug(result.slug);
      } catch (err) {
        setSlug(collection.slug ?? "");
        setError(err instanceof Error ? err.message : "Failed to update slug.");
      }
    });
  }

  return (
    <tr>
      <td className="font-medium text-base-content">{collection.name}</td>
      <td className="text-base-content/65">{collection.ownerEmail ?? "—"}</td>
      <td className="text-base-content/65">{collection.termCount}</td>
      <td>
        <input
          type="checkbox"
          className="toggle toggle-sm toggle-primary"
          checked={isBuiltin}
          disabled={isPending}
          onChange={(event) => handleBuiltinChange(event.target.checked)}
          aria-label={`Mark ${collection.name} as built-in`}
        />
      </td>
      <td>
        <input
          type="checkbox"
          className="toggle toggle-sm toggle-primary"
          checked={isPublic}
          disabled={isPending || !isBuiltin}
          onChange={(event) => handlePublicChange(event.target.checked)}
          aria-label={`Publish ${collection.name}`}
        />
      </td>
      <td>
        {isPublic ? (
          <input
            type="text"
            className="input input-sm input-bordered w-40"
            value={slug}
            disabled={isPending}
            onChange={(event) => setSlug(event.target.value)}
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
