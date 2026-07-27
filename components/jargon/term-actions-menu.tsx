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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TermFormDialog } from "@/components/jargon/term-form-dialog";
import { useTermActions } from "@/hooks/use-term-actions";
import type { Term } from "@/lib/jargon/types";

type TermActionsMenuProps = {
  term: Term;
  domainId: string;
  domainTerms: Term[];
};

export function TermActionsMenu({ term, domainId, domainTerms }: TermActionsMenuProps) {
  const { deleteTerm: removeTerm, isBusy, busyId, error } = useTermActions();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const disabled = isBusy && busyId === term.id;

  async function handleConfirmDelete() {
    const success = await removeTerm(term.id, () => setDeleteOpen(false));
    if (success) {
      setDeleteOpen(false);
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
          isDisabled={disabled}
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
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
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
