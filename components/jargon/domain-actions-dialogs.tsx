import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Domain } from "@/lib/jargon/types";

function subscriberCountMessage(count: number) {
  if (count === 0) {
    return "No one else has added this collection yet.";
  }
  if (count === 1) {
    return "1 other person has added this collection.";
  }
  return `${count} other people have added this collection.`;
}

type DomainActionsDialogsProps = {
  domain: Domain;
  shareConfirmOpen: boolean;
  onShareConfirmOpenChange: (open: boolean) => void;
  onConfirmShare: () => void;
  unshareConfirmOpen: boolean;
  onUnshareConfirmOpenChange: (open: boolean) => void;
  onConfirmUnshare: () => void;
  subscriberCount: number | null;
  subscriberCountLoading: boolean;
  subscriberCountError: string | null;
  deleteOpen: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
  resetProgressOpen: boolean;
  onResetProgressOpenChange: (open: boolean) => void;
  onConfirmResetProgress: () => void;
};

export function DomainActionsDialogs({
  domain,
  shareConfirmOpen,
  onShareConfirmOpenChange,
  onConfirmShare,
  unshareConfirmOpen,
  onUnshareConfirmOpenChange,
  onConfirmUnshare,
  subscriberCount,
  subscriberCountLoading,
  subscriberCountError,
  deleteOpen,
  onDeleteOpenChange,
  onConfirmDelete,
  resetProgressOpen,
  onResetProgressOpenChange,
  onConfirmResetProgress,
}: DomainActionsDialogsProps) {
  return (
    <>
      <AlertDialog isOpen={shareConfirmOpen} onOpenChange={onShareConfirmOpenChange}>
        <AlertDialogHeader>
          <AlertDialogTitle>Share collection?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{domain.name}&rdquo; will show up in Browse shared collections. You can unshare
            it anytime.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onPress={onConfirmShare}>Share</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>

      <AlertDialog isOpen={unshareConfirmOpen} onOpenChange={onUnshareConfirmOpenChange}>
        <AlertDialogHeader>
          <AlertDialogTitle>Unshare collection?</AlertDialogTitle>
          <AlertDialogDescription>
            {subscriberCountLoading ? (
              "Checking who else uses this collection…"
            ) : subscriberCountError ? (
              subscriberCountError
            ) : subscriberCount === null ? (
              "Unsharing will hide this collection from Browse shared collections."
            ) : (
              <>
                {subscriberCountMessage(subscriberCount)} Unsharing will hide &ldquo;{domain.name}
                &rdquo; from Browse shared collections.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onPress={onConfirmUnshare}
            isDisabled={subscriberCountLoading || subscriberCountError !== null}
          >
            Unshare
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>

      <AlertDialog isOpen={deleteOpen} onOpenChange={onDeleteOpenChange}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete collection?</AlertDialogTitle>
          <AlertDialogDescription>
            Delete &ldquo;{domain.name}&rdquo; and all its terms? This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onPress={onConfirmDelete}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>

      <AlertDialog isOpen={resetProgressOpen} onOpenChange={onResetProgressOpenChange}>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset progress?</AlertDialogTitle>
          <AlertDialogDescription>
            Reset all progress for &ldquo;{domain.name}&rdquo;? This will mark all{" "}
            {domain.knownCount} {domain.knownCount === 1 ? "term" : "terms"} as unknown. This
            can&apos;t be undone.
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
