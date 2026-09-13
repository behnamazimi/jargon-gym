"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TermFormDialog } from "@/components/jargon/term-form-dialog";
import { useToast } from "@/components/ui/toast";
import { useTermActions } from "@/hooks/use-term-actions";
import type { Term } from "@/lib/jargon/types";

type TermActionsMenuProps = {
  term: Term;
  domainId: string;
  domainTerms: Term[];
  onTermRemoved: (termId: string) => void;
  onTermRemoveFailed: (term: Term, index: number, domainId: string) => void;
};

export function TermActionsMenu({
  term,
  domainId,
  domainTerms,
  onTermRemoved,
  onTermRemoveFailed,
}: TermActionsMenuProps) {
  const { deleteTerm: removeTerm } = useTermActions();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleConfirmDelete() {
    const index = domainTerms.findIndex((t) => t.id === term.id);
    setDeleteOpen(false);
    onTermRemoved(term.id);
    const success = await removeTerm(term.id);
    if (success) {
      toast(`"${term.term}" deleted`);
    } else {
      onTermRemoveFailed(term, index === -1 ? domainTerms.length : index, domainId);
      toast(`Couldn't delete "${term.term}" — it's back in the list.`, "destructive");
    }
  }

  return (
    <>
      <DropdownMenuTrigger>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-base-content/60 hover:text-base-content"
          aria-label={`Actions for ${term.term}`}
        >
          <MoreVertical className="size-4" />
        </Button>
        <DropdownMenu className="min-w-[160px]">
          <DropdownMenuItem onAction={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onAction={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenu>
      </DropdownMenuTrigger>

      <TermFormDialog
        mode="edit"
        domainId={domainId}
        domainTerms={domainTerms}
        initialTerm={term}
        isOpen={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog isOpen={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete term?</AlertDialogTitle>
          <AlertDialogDescription>
            Delete &ldquo;{term.term}&rdquo;? This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onPress={handleConfirmDelete}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </>
  );
}
