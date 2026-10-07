import { Suspense, use } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Domain } from "@/lib/terms/types";
import { pluralize } from "@/lib/utils";

function subscriberCountMessage(count: number) {
  if (count === 0) {
    return "No one else has added this collection yet.";
  }
  if (count === 1) {
    return "1 other person has added this collection.";
  }
  return `${count} other people have added this collection.`;
}

/** Who else uses the collection, asked for when the unshare dialog opens. */
export type SubscriberCheck = { count?: number; error?: string };

function UnshareBody({
  domain,
  check,
  onConfirmUnshare,
}: {
  domain: Domain;
  check: Promise<SubscriberCheck> | null;
  onConfirmUnshare: () => void;
}) {
  const result = check ? use(check) : null;
  return <UnshareContent domain={domain} result={result} onConfirmUnshare={onConfirmUnshare} />;
}

function UnshareContent({
  domain,
  result,
  onConfirmUnshare,
}: {
  domain: Domain;
  /** Undefined while the check is still running. */
  result: SubscriberCheck | null | undefined;
  onConfirmUnshare: () => void;
}) {
  const loading = result === undefined;
  const error = result?.error ?? null;
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Unshare collection?</AlertDialogTitle>
        <AlertDialogDescription>
          {loading ? (
            "Checking who else uses this collection…"
          ) : error ? (
            error
          ) : result?.count === undefined ? (
            "Unsharing will hide this collection from Browse."
          ) : (
            <>
              {subscriberCountMessage(result.count)} Unsharing will hide &ldquo;{domain.name}
              &rdquo; from Browse.
            </>
          )}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onPress={onConfirmUnshare} isDisabled={loading || error !== null}>
          Unshare
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}

type DomainActionsDialogsProps = {
  domain: Domain;
  shareConfirmOpen: boolean;
  onShareConfirmOpenChange: (open: boolean) => void;
  onConfirmShare: () => void;
  /** Who else uses the collection, asked for when the unshare dialog opened. */
  subscriberCheck: Promise<SubscriberCheck> | null;
  unshareOpen: boolean;
  onUnshareClose: () => void;
  onConfirmUnshare: () => void;
  deleteOpen: boolean;
  /** The delete is running: the dialog stays up and can't be dismissed. */
  deleting: boolean;
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
  subscriberCheck,
  unshareOpen,
  onUnshareClose,
  onConfirmUnshare,
  deleteOpen,
  deleting,
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
            &ldquo;{domain.name}&rdquo; will show up in Browse. You can unshare it anytime.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onPress={onConfirmShare}>Share</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>

      <AlertDialog
        isOpen={unshareOpen}
        onOpenChange={(open) => {
          if (!open) onUnshareClose();
        }}
      >
        <Suspense
          fallback={
            <UnshareContent
              domain={domain}
              result={undefined}
              onConfirmUnshare={onConfirmUnshare}
            />
          }
        >
          <UnshareBody
            domain={domain}
            check={subscriberCheck}
            onConfirmUnshare={onConfirmUnshare}
          />
        </Suspense>
      </AlertDialog>

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
            Delete &ldquo;{domain.name}&rdquo; and all its terms? This can&apos;t be undone.
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
            {`Erase your learning progress for all ${pluralize(domain.termCount, "term")} in “${domain.name}”? Mastered and marked-known terms start over, and Triage choices are cleared. This can't be undone.`}
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
