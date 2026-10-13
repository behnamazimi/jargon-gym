import type { Collection } from "@/lib/terms/types";

/** Where a collection's share link points: a built-in's public page, or the
 *  shared-link landing for everything else. A path, so the browser adds its origin. */
export function sharePath(collection: Pick<Collection, "id" | "publicSlug">): string {
  return collection.publicSlug ? `/collections/${collection.publicSlug}` : `/c/${collection.id}`;
}

export function shareLink(collection: Pick<Collection, "id" | "publicSlug">): string {
  return new URL(sharePath(collection), window.location.origin).toString();
}
