"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type TermActionsMenuProps = {
  termName: string;
  onEdit: () => void;
  onDelete: () => void;
};

/** A row's ⋯ menu. The edit and delete dialogs live once on the list
 *  (TermRowDialogs), not once per row. */
export function TermActionsMenu({ termName, onEdit, onDelete }: TermActionsMenuProps) {
  return (
    <DropdownMenuTrigger>
      <Button
        variant="ghost"
        size="icon-sm"
        className="hit-area text-base-content/70 hover:text-base-content"
        aria-label={`Actions for ${termName}`}
      >
        <MoreVertical className="size-4" />
      </Button>
      <DropdownMenu className="min-w-[160px]">
        <DropdownMenuItem onAction={onEdit}>
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onAction={onDelete}>
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenu>
    </DropdownMenuTrigger>
  );
}
