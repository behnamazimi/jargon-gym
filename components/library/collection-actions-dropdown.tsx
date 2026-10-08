import {
  BookmarkMinus,
  Download,
  Flag,
  Lock,
  Pencil,
  RotateCcw,
  Settings,
  Pause,
  Play,
  Share2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { REPORTED_THANKS } from "@/lib/collections/moderation";
import type { Collection } from "@/lib/terms/types";

type CollectionActionsDropdownProps = {
  collection: Collection;
  disabled: boolean;
  onToggleActiveForReview: () => void;
  onResetProgress: () => void;
  onExport: () => void;
  onEdit: () => void;
  onShare: () => void;
  onUnshare: () => void;
  onDelete: () => void;
  onReport: () => void;
  onRemoveFromCollection: () => void;
};

export function CollectionActionsDropdown({
  collection,
  disabled,
  onToggleActiveForReview,
  onResetProgress,
  onExport,
  onEdit,
  onShare,
  onUnshare,
  onDelete,
  onReport,
  onRemoveFromCollection,
}: CollectionActionsDropdownProps) {
  return (
    <DropdownMenuTrigger>
      <Button
        variant="ghost"
        size="icon-sm"
        className="min-h-11 min-w-11 text-base-content/70 hover:text-base-content md:min-h-8 md:min-w-8"
        aria-label="Collection actions"
        data-tour="library-actions"
        isDisabled={disabled}
      >
        <Settings className="size-5" />
      </Button>
      <DropdownMenu className="min-w-[210px]">
        <DropdownMenuItem isDisabled={disabled} onAction={onToggleActiveForReview}>
          {collection.isActiveForReview ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {collection.isActiveForReview ? "Pause review" : "Resume review"}
        </DropdownMenuItem>

        <DropdownMenuItem
          variant="destructive"
          isDisabled={disabled || collection.knownCount === 0}
          onAction={onResetProgress}
        >
          <RotateCcw className="h-4 w-4" />
          Reset progress
        </DropdownMenuItem>

        <DropdownMenuItem isDisabled={disabled} onAction={onExport}>
          <Download className="h-4 w-4" />
          Export JSON
        </DropdownMenuItem>

        {collection.source === "owned" ? (
          <>
            <DropdownMenuItem isDisabled={disabled} onAction={onEdit}>
              <Pencil className="h-4 w-4" />
              Edit collection
            </DropdownMenuItem>
            {collection.visibility === "private" ? (
              <DropdownMenuItem
                isDisabled={disabled || collection.shareBlockedReason !== null}
                onAction={onShare}
              >
                <Share2 className="h-4 w-4" />
                Share collection
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem isDisabled={disabled} onAction={onUnshare}>
                <Lock className="h-4 w-4" />
                Unshare collection
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" isDisabled={disabled} onAction={onDelete}>
              <Trash2 className="h-4 w-4" />
              Delete collection
            </DropdownMenuItem>
          </>
        ) : (
          <>
            {collection.isBuiltin ? null : (
              <DropdownMenuItem
                isDisabled={disabled || collection.reportedByMe}
                onAction={onReport}
              >
                <Flag className="h-4 w-4" />
                {collection.reportedByMe ? REPORTED_THANKS : "Report collection"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem isDisabled={disabled} onAction={onRemoveFromCollection}>
              <BookmarkMinus className="h-4 w-4" />
              Remove from collection
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenu>
    </DropdownMenuTrigger>
  );
}
