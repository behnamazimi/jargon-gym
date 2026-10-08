import type { Collection } from "@/lib/terms/types";

/** Cookie holding the collection last opened in the Library, so a plain
 *  /app/library visit can start loading its terms right away. */
export const LIBRARY_LAST_COLLECTION_COOKIE = "lb_lib_collection";

/** The collection the Library shows: the one asked for, else the one last
 *  viewed, else the first active one, else the first. Shared by the server
 *  page and the sidebar so both agree without talking to each other. */
export function pickLibraryCollectionId(
  collections: Pick<Collection, "id" | "isActiveForReview">[],
  options: { requestedCollectionId?: string | null; lastCollectionId?: string | null },
): string | undefined {
  const has = (id: string | null | undefined): id is string =>
    Boolean(id) && collections.some((collection) => collection.id === id);
  if (has(options.requestedCollectionId)) return options.requestedCollectionId;
  if (has(options.lastCollectionId)) return options.lastCollectionId;
  return (collections.find((collection) => collection.isActiveForReview) ?? collections[0])?.id;
}

export function rememberLibraryCollection(collectionId: string) {
  document.cookie = `${LIBRARY_LAST_COLLECTION_COOKIE}=${collectionId}; path=/; max-age=31536000; samesite=lax`;
}
