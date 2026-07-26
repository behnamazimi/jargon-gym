"use client";

import {
  BookmarkMinus,
  BookOpen,
  FolderOpen,
  Globe,
  Link2,
  Lock,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import type { Domain } from "@/lib/jargon/types";
import { cn, pluralize } from "@/lib/utils";

type DomainActionsMenuProps = {
  domain: Domain;
  domains: Domain[];
};

function subscriberCountMessage(count: number) {
  if (count === 0) {
    return "No other users have added this domain to their collection yet.";
  }
  if (count === 1) {
    return "1 other user has added this domain to their collection.";
  }
  return `${count} other users have added this domain to their collection.`;
}

export function DomainActionsMenu({ domain, domains }: DomainActionsMenuProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareConfirmOpen, setShareConfirmOpen] = useState(false);
  const [unshareConfirmOpen, setUnshareConfirmOpen] = useState(false);
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
          className="text-muted-foreground hover:text-foreground"
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

          {domain.source === "owned" ? (
            <>
              {domain.visibility === "private" ? (
                <DropdownMenuItem isDisabled={disabled} onAction={() => setShareConfirmOpen(true)}>
                  <Share2 className="h-4 w-4" />
                  Share domain
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  isDisabled={disabled}
                  onAction={() => setUnshareConfirmOpen(true)}
                >
                  <Lock className="h-4 w-4" />
                  Unshare domain
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                isDisabled={disabled}
                onAction={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete domain
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

      <AlertDialog isOpen={shareConfirmOpen} onOpenChange={setShareConfirmOpen}>
        <AlertDialogHeader>
          <AlertDialogTitle>Share domain?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{domain.name}&rdquo; will become visible to other users in Browse shared domains.
            You can unshare it later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onPress={handleConfirmShare}>Share</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>

      <AlertDialog isOpen={unshareConfirmOpen} onOpenChange={setUnshareConfirmOpen}>
        <AlertDialogHeader>
          <AlertDialogTitle>Unshare domain?</AlertDialogTitle>
          <AlertDialogDescription>
            {subscriberCountLoading ? (
              "Checking how many users added this domain…"
            ) : subscriberCountError ? (
              subscriberCountError
            ) : subscriberCount === null ? (
              "Unsharing will hide this domain from Browse shared domains."
            ) : (
              <>
                {subscriberCountMessage(subscriberCount)} Unsharing will hide &ldquo;{domain.name}
                &rdquo; from Browse shared domains.
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
          <AlertDialogTitle>Delete domain?</AlertDialogTitle>
          <AlertDialogDescription>
            Delete &ldquo;{domain.name}&rdquo; and all its terms? This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onPress={handleConfirmDelete}>
            Delete
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

function StatusBadge({
  icon: Icon,
  label,
  variant,
}: {
  icon: typeof Globe;
  label: string;
  variant: "private" | "shared" | "added" | "active" | "paused";
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium",
        variant === "private" && "border-border bg-muted/50 text-muted-foreground",
        variant === "shared" && "border-primary/30 bg-primary/10 text-primary",
        variant === "added" && "border-border bg-secondary text-secondary-foreground",
        variant === "active" && "border-primary/40 bg-primary/15 text-primary",
        variant === "paused" && "border-border bg-muted text-muted-foreground",
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </Badge>
  );
}

function StatItem({ icon: Icon, label }: { icon: typeof FolderOpen; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="size-3.5 shrink-0 opacity-60" aria-hidden />
      {label}
    </span>
  );
}

export function DomainMeta({ domain, categoryCount }: { domain: Domain; categoryCount: number }) {
  const visibilityVariant =
    domain.source === "owned" ? (domain.visibility === "shared" ? "shared" : "private") : "added";

  const VisibilityIcon =
    domain.source === "owned" ? (domain.visibility === "shared" ? Globe : Lock) : Link2;

  const visibilityLabel =
    domain.source === "owned" ? (domain.visibility === "shared" ? "Shared" : "Private") : "Added";

  return (
    <div className="min-w-0 flex-1 space-y-2">
      {domain.description ? (
        <p className="max-w-prose text-base leading-relaxed text-foreground/85">
          {domain.description}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge icon={VisibilityIcon} label={visibilityLabel} variant={visibilityVariant} />
          <StatusBadge
            icon={domain.isActiveForReview ? Play : Pause}
            label={domain.isActiveForReview ? "Active" : "Paused"}
            variant={domain.isActiveForReview ? "active" : "paused"}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatItem icon={FolderOpen} label={pluralize(domain.termCount, "term")} />
          <StatItem icon={BookOpen} label={pluralize(categoryCount, "category", "categories")} />
        </div>
      </div>
    </div>
  );
}
