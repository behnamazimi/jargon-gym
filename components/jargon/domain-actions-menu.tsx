"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getDomainSubscriberCount } from "@/app/(private)/jargon/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import type { Domain, Term } from "@/lib/jargon/types";
import { DomainExportDialog } from "./domain-export-dialog";
import { DomainFormDialog } from "./domain-form-dialog";
import { DomainActionsDialogs } from "./domain-actions-dialogs";
import { DomainActionsDropdown } from "./domain-actions-dropdown";

export { DomainMeta } from "./domain-meta";

type DomainActionsMenuProps = {
  domain: Domain;
  domains: Domain[];
  terms: Term[];
};

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
      <DomainActionsDropdown
        domain={domain}
        disabled={disabled}
        onToggleActiveForReview={() => toggleActiveForReview(domain.id, !domain.isActiveForReview)}
        onResetProgress={() => setResetProgressOpen(true)}
        onExport={() => setExportOpen(true)}
        onEdit={() => setEditOpen(true)}
        onShare={() => setShareConfirmOpen(true)}
        onUnshare={() => setUnshareConfirmOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        onRemoveFromCollection={() => {
          const fallback = domains.find((item) => item.id !== domain.id);
          removeFromCollection(domain.id, () => {
            router.push(fallback ? `/jargon?domain=${fallback.id}` : "/jargon");
          });
        }}
      />

      {domain.source === "owned" ? (
        <DomainFormDialog domain={domain} isOpen={editOpen} onOpenChange={setEditOpen} />
      ) : null}

      <DomainExportDialog
        domain={domain}
        terms={terms}
        isOpen={exportOpen}
        onOpenChange={setExportOpen}
      />

      <DomainActionsDialogs
        domain={domain}
        shareConfirmOpen={shareConfirmOpen}
        onShareConfirmOpenChange={setShareConfirmOpen}
        onConfirmShare={handleConfirmShare}
        unshareConfirmOpen={unshareConfirmOpen}
        onUnshareConfirmOpenChange={setUnshareConfirmOpen}
        onConfirmUnshare={handleConfirmUnshare}
        subscriberCount={subscriberCount}
        subscriberCountLoading={subscriberCountLoading}
        subscriberCountError={subscriberCountError}
        deleteOpen={deleteOpen}
        onDeleteOpenChange={setDeleteOpen}
        onConfirmDelete={handleConfirmDelete}
        resetProgressOpen={resetProgressOpen}
        onResetProgressOpenChange={setResetProgressOpen}
        onConfirmResetProgress={handleConfirmResetProgress}
      />

      {error ? (
        <Alert variant="destructive" className="absolute right-0 top-full z-10 mt-2 w-48">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
