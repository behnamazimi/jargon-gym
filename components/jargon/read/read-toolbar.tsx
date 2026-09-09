import { Maximize } from "lucide-react";
import { CollectionSelect } from "@/components/jargon/collection-select";
import { Button } from "@/components/ui/button";
import type { StudyCollection } from "@/lib/study/types";
import { cn } from "@/lib/utils";
import { allTermCount, termCountForSelection } from "@/components/jargon/read/read-page-helpers";

const PRESS_CLASS = "transition-transform duration-150 ease-out active:scale-[0.96]";

type ReadToolbarProps = {
  collections: StudyCollection[];
  selectedCollectionId: string;
  isFetchingMore: boolean;
  preferenceOn: boolean;
  onCollectionChange: (domainId: string) => void;
  onEnterFullscreen: () => void;
};

export function ReadToolbar({
  collections,
  selectedCollectionId,
  isFetchingMore,
  preferenceOn,
  onCollectionChange,
  onEnterFullscreen,
}: ReadToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      {collections.length > 0 ? (
        <div className="flex items-center gap-3">
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
          <span className="shrink-0 text-xs text-base-content/50 tabular-nums">
            {termCountForSelection(selectedCollectionId, collections)} available
          </span>
        </div>
      ) : (
        <div className="flex-1" />
      )}
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Enter focus mode"
        onPress={onEnterFullscreen}
        className={cn("shrink-0", preferenceOn && "ring-2 ring-primary/60", PRESS_CLASS)}
      >
        <Maximize className="size-4" aria-hidden strokeWidth={1.5} />
      </Button>
    </div>
  );
}
