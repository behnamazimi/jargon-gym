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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import type { Domain } from "@/lib/jargon/types";
import { cn } from "@/lib/utils";

type DomainActionsMenuProps = {
  domain: Domain;
  domains: Domain[];
};

export function DomainActionsMenu({ domain, domains }: DomainActionsMenuProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
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
          <Settings className="h-6 w-6" />
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
                <DropdownMenuItem isDisabled={disabled} onAction={() => shareDomain(domain.id)}>
                  <Share2 className="h-4 w-4" />
                  Share domain
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem isDisabled={disabled} onAction={() => unshareDomain(domain.id)}>
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
        <p className="absolute right-0 top-full mt-10 w-48 text-xs text-destructive">{error}</p>
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
          <StatItem icon={FolderOpen} label={`${domain.termCount} terms`} />
          <StatItem icon={BookOpen} label={`${categoryCount} categories`} />
        </div>
      </div>
    </div>
  );
}
