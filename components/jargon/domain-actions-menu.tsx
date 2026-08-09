"use client";

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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getDomainSubscriberCount } from "@/app/(private)/jargon/actions";
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
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import type { Domain, Term } from "@/lib/jargon/types";
import { pluralize } from "@/lib/utils";
import { DomainExportDialog } from "./domain-export-dialog";
import { DomainFormDialog } from "./domain-form-dialog";

type DomainActionsMenuProps = {
  domain: Domain;
  domains: Domain[];
  terms: Term[];
};

function subscriberCountMessage(count: number) {
  if (count === 0) {
    return "No one else has added this collection yet.";
  }
  if (count === 1) {
    return "1 other person has added this collection.";
  }
  return `${count} other people have added this collection.`;
}

export function DomainActionsMenu({ domain, domains, terms }: DomainActionsMenuProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [shareConfirmOpen, setShareConfirmOpen] = useState(false);
  const [unshareConfirmOpen, setUnshareConfirmOpen] = useState(false);
  const [resetProgressOpen, setResetProgressOpen] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [subscriberCountLoading, setSubscriberCountLoading] = useState(false);
  const [subscriberCountError, setSubscriberCountError] = useState<string | null>(null);
  const {
    error,
    isBusy,
    busyId,
    toggleActiveForReview,
    shareDomain,
    unshareDomain,
    deleteOwnedDomain,
    removeFromCollection,
    resetProgress,
  } = useCollectionActions();

  const disabled = isBusy && busyId === domain.id;

  function handleConfirmDelete() {
    deleteOwnedDomain(domain.id, () => router.push("/jargon"));
    setDeleteOpen(false);
  }

  function handleConfirmShare() {
    shareDomain(domain.id);
    setShareConfirmOpen(false);
  }

  function handleConfirmUnshare() {
    unshareDomain(domain.id);
    setUnshareConfirmOpen(false);
  }

  function handleConfirmResetProgress() {
    resetProgress(domain.id);
    setResetProgressOpen(false);
  }

  useEffect(() => {
    if (!unshareConfirmOpen) {
      setSubscriberCount(null);
      setSubscriberCountError(null);
      setSubscriberCountLoading(false);
      return;
    }

    let cancelled = false;
    setSubscriberCountLoading(true);
    setSubscriberCountError(null);

    getDomainSubscriberCount(domain.id).then((result) => {
      if (cancelled) return;

      setSubscriberCountLoading(false);

      if (result.error) {
        setSubscriberCountError(result.error);
        return;
      }

      setSubscriberCount(result.count ?? 0);
    });

    return () => {
      cancelled = true;
    };
  }, [unshareConfirmOpen, domain.id]);

  return (
    <div className="relative shrink-0">
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
          <DropdownMenuItem
            isDisabled={disabled}
            onAction={() => toggleActiveForReview(domain.id, !domain.isActiveForReview)}
          >
            {domain.isActiveForReview ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {domain.isActiveForReview ? "Pause review" : "Resume review"}
          </DropdownMenuItem>

          <DropdownMenuItem
            variant="destructive"
            isDisabled={disabled || domain.knownCount === 0}
            onAction={() => setResetProgressOpen(true)}
          >
            <RotateCcw className="h-4 w-4" />
            Reset progress
          </DropdownMenuItem>

          <DropdownMenuItem isDisabled={disabled} onAction={() => setExportOpen(true)}>
            <Download className="h-4 w-4" />
            Export JSON
          </DropdownMenuItem>

          {domain.source === "owned" ? (
            <>
              <DropdownMenuItem isDisabled={disabled} onAction={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Edit collection
              </DropdownMenuItem>
              {domain.visibility === "private" ? (
                <DropdownMenuItem isDisabled={disabled} onAction={() => setShareConfirmOpen(true)}>
                  <Share2 className="h-4 w-4" />
                  Share collection
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  isDisabled={disabled}
                  onAction={() => setUnshareConfirmOpen(true)}
                >
                  <Lock className="h-4 w-4" />
                  Unshare collection
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                isDisabled={disabled}
                onAction={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete collection
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem
              isDisabled={disabled}
              onAction={() => {
                const fallback = domains.find((item) => item.id !== domain.id);
                removeFromCollection(domain.id, () => {
                  router.push(fallback ? `/jargon?domain=${fallback.id}` : "/jargon");
                });
              }}
            >
              <BookmarkMinus className="h-4 w-4" />
              Remove from collection
            </DropdownMenuItem>
          )}
        </DropdownMenu>
      </DropdownMenuTrigger>

      {domain.source === "owned" ? (
        <DomainFormDialog domain={domain} isOpen={editOpen} onOpenChange={setEditOpen} />
      ) : null}

      <DomainExportDialog
        domain={domain}
        terms={terms}
        isOpen={exportOpen}
        onOpenChange={setExportOpen}
      />

      <AlertDialog isOpen={shareConfirmOpen} onOpenChange={setShareConfirmOpen}>
        <AlertDialogHeader>
          <AlertDialogTitle>Share collection?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{domain.name}&rdquo; will show up in Browse shared collections. You can unshare
            it anytime.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onPress={handleConfirmShare}>Share</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>

      <AlertDialog isOpen={unshareConfirmOpen} onOpenChange={setUnshareConfirmOpen}>
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
            onPress={handleConfirmUnshare}
            isDisabled={subscriberCountLoading || subscriberCountError !== null}
          >
            Unshare
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>

      <AlertDialog isOpen={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete collection?</AlertDialogTitle>
          <AlertDialogDescription>
            Delete &ldquo;{domain.name}&rdquo; and all its terms? This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onPress={handleConfirmDelete}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>

      <AlertDialog isOpen={resetProgressOpen} onOpenChange={setResetProgressOpen}>
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
          <AlertDialogAction variant="destructive" onPress={handleConfirmResetProgress}>
            Reset progress
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>

      {error ? (
        <Alert variant="destructive" className="absolute right-0 top-full z-10 mt-2 w-48">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

export function DomainMeta({ domain, categoryCount }: { domain: Domain; categoryCount: number }) {
  const parts: string[] = [];

  if (domain.source === "owned") {
    if (domain.visibility === "shared") parts.push("Shared");
  } else {
    parts.push("Added");
  }

  if (!domain.isActiveForReview) parts.push("Paused");

  parts.push(pluralize(domain.termCount, "term"));
  parts.push(pluralize(categoryCount, "category", "categories"));

  return (
    <div className="min-w-0 flex-1 space-y-2">
      {domain.description ? (
        <p className="max-w-prose text-base leading-relaxed text-base-content/85">
          {domain.description}
        </p>
      ) : null}
      <p className="m-0 text-xs text-base-content/60">{parts.join(" · ")}</p>
    </div>
  );
}
