"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast";
import { forgetTermDetails } from "@/lib/library/details-store";
import type { LibraryTerm, Term } from "@/lib/terms/types";

const TermFormDialog = dynamic(() =>
  import("@/components/terms/term-form-dialog").then((mod) => mod.TermFormDialog),
);

type TermRowDialogsProps = {
  domainTerms: LibraryTerm[];
  /** The term being edited, with its details loaded. */
  editing: Term | null;
  onEditingChange: (term: Term | null) => void;
  deleting: LibraryTerm | null;
  onDeletingChange: (term: LibraryTerm | null) => void;
  /** The details snapshot to drop once a term is gone. */
  detailsScope: string;
  /** Deletes the term; resolves false if it couldn't. */
  onRemove: (termId: string) => Promise<boolean>;
};

/** The edit and delete dialogs for whichever row asked, mounted once for
 *  the whole list instead of once per row. */
export function TermRowDialogs({
  domainTerms,
  editing,
  onEditingChange,
  deleting,
  onDeletingChange,
  detailsScope,
  onRemove,
}: TermRowDialogsProps) {
  const { toast } = useToast();

  async function confirmDelete(term: LibraryTerm) {
    onDeletingChange(null);
    if (await onRemove(term.id)) {
      // Other cards may still list it under related terms.
      forgetTermDetails(detailsScope);
      toast(`"${term.term}" deleted`);
    } else {
      toast(`Couldn't delete "${term.term}". It's back in the list.`, "destructive");
    }
  }

  return (
    <>
      {editing ? (
        <Suspense fallback={null}>
          <TermFormDialog
            key={editing.id}
            domainTerms={domainTerms}
            initialTerm={editing}
            isOpen
            onOpenChange={(open) => {
              if (!open) onEditingChange(null);
            }}
          />
        </Suspense>
      ) : null}

      <AlertDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => {
          if (!open) onDeletingChange(null);
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Delete term?</AlertDialogTitle>
          <AlertDialogDescription>
            Delete &ldquo;{deleting?.term}&rdquo;? This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onPress={() => {
              if (deleting) void confirmDelete(deleting);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </>
  );
}
