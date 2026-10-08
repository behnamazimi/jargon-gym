"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { collectionCountsOverride, useLibraryOverrides } from "@/lib/library/overrides";
import {
  LIBRARY_LAST_COLLECTION_COOKIE,
  pickLibraryCollectionId,
} from "@/lib/library/pick-collection";
import type { Collection } from "@/lib/terms/types";
import { CollectionSidebar } from "./collection-sidebar";
import { CollectionSidebarDrawer } from "./collection-sidebar-drawer";

type LibrarySidebarProps = {
  collections: Collection[];
  /** Server time the counts were read. */
  loadedAt: number;
  /** The last-viewed collection as the server saw it. */
  lastCollectionId: string | null;
};

function readLastCollectionCookie(): string | null {
  const prefix = `${LIBRARY_LAST_COLLECTION_COOKIE}=`;
  const entry = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

const noSubscription = () => () => {};

/**
 * The collection list: a drawer on phones, a sticky panel on larger screens.
 * It stays mounted while collections switch (only the page below it
 * reloads), so it works out which one is open the same way the page does.
 */
export function LibrarySidebar({ collections, loadedAt, lastCollectionId }: LibrarySidebarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const requestedCollectionId = useSearchParams().get("collection");
  const lastViewed = useSyncExternalStore(
    noSubscription,
    readLastCollectionCookie,
    () => lastCollectionId,
  );
  const overrides = useLibraryOverrides();

  const liveCollections = useMemo(
    () =>
      collections.map((collection) => {
        const counts = collectionCountsOverride(overrides, collection.id, loadedAt);
        if (!counts) return collection;
        const { termCount, knownCount, termsLearnedCount } = counts;
        return { ...collection, termCount, knownCount, termsLearnedCount };
      }),
    [collections, overrides, loadedAt],
  );

  const currentCollectionId =
    pickLibraryCollectionId(liveCollections, {
      requestedCollectionId,
      lastCollectionId: lastViewed,
    }) ?? "";
  const currentCollection = liveCollections.find(
    (collection) => collection.id === currentCollectionId,
  );
  if (!currentCollection) return null;

  return (
    <>
      <CollectionSidebarDrawer
        collections={liveCollections}
        currentCollection={currentCollection}
        currentCollectionId={currentCollectionId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      <aside className="hidden md:flex md:w-68 md:shrink-0">
        <div className="shadow-surface sticky top-4 flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-box bg-base-100 p-2">
          <CollectionSidebar
            collections={liveCollections}
            currentCollectionId={currentCollectionId}
            className="min-h-0 flex-1"
          />
        </div>
      </aside>
    </>
  );
}
