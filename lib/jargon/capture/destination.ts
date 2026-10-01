type Option = { id: string };

/** Where a captured term goes: the collection named in the link, else the one
 *  used last on this device, else the first. A remembered or linked id that
 *  isn't an owned collection (deleted, or not yours) is ignored. */
export function pickDestination({
  preset,
  stored,
  collections,
}: {
  preset: string | null | undefined;
  stored: string | null | undefined;
  collections: Option[];
}): string | null {
  const owned = (id: string | null | undefined) =>
    id && collections.some((collection) => collection.id === id) ? id : null;
  return owned(preset) ?? owned(stored) ?? collections[0]?.id ?? null;
}
