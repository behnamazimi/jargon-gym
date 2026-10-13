import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Collection } from "@/lib/terms/types";
import { pluralize } from "@/lib/utils";

type CollectionActionsDialogsProps = {
  collection: Collection;
  deleteOpen: boolean;
  /** The delete is running: the dialog stays up and can't be dismissed. */
  deleting: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
  resetProgressOpen: boolean;
  onResetProgressOpenChange: (open: boolean) => void;
  onConfirmResetProgress: () => void;
};

export function CollectionActionsDialogs({
  collection,
  deleteOpen,
  deleting,
  onDeleteOpenChange,
  onConfirmDelete,
  resetProgressOpen,
  onResetProgressOpenChange,
  onConfirmResetProgress,
}: CollectionActionsDialogsProps) {
  return (
    <>
      <AlertDialog
        isOpen={deleteOpen}
        onOpenChange={(open) => {
          if (!deleting) onDeleteOpenChange(open);
        }}
        isKeyboardDismissDisabled={deleting}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Delete collection?</AlertDialogTitle>
          <AlertDialogDescription>
            Delete &ldquo;{collection.name}&rdquo; and all its terms? This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel isDisabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            slot={null}
            variant="destructive"
            onPress={onConfirmDelete}
            isDisabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>

      <AlertDialog isOpen={resetProgressOpen} onOpenChange={onResetProgressOpenChange}>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset progress?</AlertDialogTitle>
          <AlertDialogDescription>
            {`Erase your learning progress for all ${pluralize(collection.termCount, "term")} in “${collection.name}”? Mastered and marked-known terms start over, and Triage choices are cleared. This can't be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onPress={onConfirmResetProgress}>
            Reset progress
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </>
  );
}
