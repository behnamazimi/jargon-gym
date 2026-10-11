import { CollectionSelect } from "@/components/library/collection-select";
import { StudyPeekSlot } from "@/components/read/study/study-peek-slot";
import type { StudyCollection } from "@/lib/study/types";
import { allTermCount } from "@/components/read/read-page-helpers";

type ReadToolbarProps = {
  collections: StudyCollection[];
  selectedCollectionId: string;
  isFetchingMore: boolean;
  /** Only while a card sits right below the toolbar. */
  showPeek: boolean;
  onCollectionChange: (collectionId: string) => void;
};

export function ReadToolbar({
  collections,
  selectedCollectionId,
  isFetchingMore,
  showPeek,
  onCollectionChange,
}: ReadToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      {collections.length > 0 ? (
        <div data-tour="read-collection" className="flex items-center gap-3">
          <CollectionSelect
            mode="local"
            id="read-collection"
            aria-label="Collection"
            className="min-w-0 w-full flex-1 sm:max-w-xs"
            triggerClassName="text-sm"
            size="sm"
            collections={collections}
            value={selectedCollectionId}
            isDisabled={isFetchingMore}
            leadingOption={{
              id: "all",
              label: `All active collections (${allTermCount(collections)})`,
            }}
            onChange={onCollectionChange}
          />
        </div>
      ) : null}
      {showPeek ? <StudyPeekSlot who="read" /> : <div className="flex-1" />}
    </div>
  );
}
