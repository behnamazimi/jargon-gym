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
import { useTermActions } from "@/hooks/use-term-actions";
import { clearTermDetails } from "@/lib/jargon/library/details-store";
import type { LibraryTerm, Term } from "@/lib/jargon/types";

const TermFormDialog = dynamic(() =>
  import("@/components/jargon/term-form-dialog").then((mod) => mod.TermFormDialog),
);

type TermRowDialogsProps = {
  domainTerms: LibraryTerm[];
  /** The term being edited, with its details loaded. */
  editing: Term | null;
  onEditingChange: (term: Term | null) => void;
  deleting: LibraryTerm | null;
  onDeletingChange: (term: LibraryTerm | null) => void;
  onTermRemoved: (termId: string) => void;
  onTermRemoveFailed: (termId: string) => void;
};

/** The edit and delete dialogs for whichever row asked, mounted once for
 *  the whole list instead of once per row. */
export function TermRowDialogs({
  domainTerms,
  editing,
  onEditingChange,
  deleting,
  onDeletingChange,
  onTermRemoved,
  onTermRemoveFailed,
}: TermRowDialogsProps) {
  const { deleteTerm } = useTermActions();
  const { toast } = useToast();

  async function confirmDelete(term: LibraryTerm) {
    onDeletingChange(null);
    onTermRemoved(term.id);
    if (await deleteTerm(term.id)) {
      toast(`"${term.term}" deleted`);
    } else {
      onTermRemoveFailed(term.id);
      toast(`Couldn't delete "${term.term}" — it's back in the list.`, "destructive");
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
              if (open) return;
              onEditingChange(null);
              // Saved links show on both terms, so loaded details may be stale.
              clearTermDetails();
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
