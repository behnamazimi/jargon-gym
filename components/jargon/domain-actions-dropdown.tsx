import {
  BookmarkMinus,
  Download,
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
import type { Domain } from "@/lib/jargon/types";

type DomainActionsDropdownProps = {
  domain: Domain;
  disabled: boolean;
  onToggleActiveForReview: () => void;
  onResetProgress: () => void;
  onExport: () => void;
  onEdit: () => void;
  onShare: () => void;
  onUnshare: () => void;
  onDelete: () => void;
  onRemoveFromCollection: () => void;
};

export function DomainActionsDropdown({
  domain,
  disabled,
  onToggleActiveForReview,
  onResetProgress,
  onExport,
  onEdit,
  onShare,
  onUnshare,
  onDelete,
  onRemoveFromCollection,
}: DomainActionsDropdownProps) {
  return (
    <DropdownMenuTrigger>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-base-content/60 hover:text-base-content"
        aria-label="Collection actions"
        isDisabled={disabled}
      >
        <Settings className="size-5" />
      </Button>
      <DropdownMenu className="min-w-[210px]">
        <DropdownMenuItem isDisabled={disabled} onAction={onToggleActiveForReview}>
          {domain.isActiveForReview ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {domain.isActiveForReview ? "Pause review" : "Resume review"}
        </DropdownMenuItem>

        <DropdownMenuItem
          variant="destructive"
          isDisabled={disabled || domain.knownCount === 0}
          onAction={onResetProgress}
        >
          <RotateCcw className="h-4 w-4" />
          Reset progress
        </DropdownMenuItem>

        <DropdownMenuItem isDisabled={disabled} onAction={onExport}>
          <Download className="h-4 w-4" />
          Export JSON
        </DropdownMenuItem>

        {domain.source === "owned" ? (
          <>
            <DropdownMenuItem isDisabled={disabled} onAction={onEdit}>
              <Pencil className="h-4 w-4" />
              Edit collection
            </DropdownMenuItem>
            {domain.visibility === "private" ? (
              <DropdownMenuItem isDisabled={disabled} onAction={onShare}>
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
          <DropdownMenuItem isDisabled={disabled} onAction={onRemoveFromCollection}>
            <BookmarkMinus className="h-4 w-4" />
            Remove from collection
          </DropdownMenuItem>
        )}
      </DropdownMenu>
    </DropdownMenuTrigger>
  );
}
