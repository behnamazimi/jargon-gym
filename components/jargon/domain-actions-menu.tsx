"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { getDomainSubscriberCount } from "@/app/(private)/jargon/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import {
  fetchCollectionExport,
  type CollectionExport,
} from "@/lib/jargon/export/fetch-collection-export";
import type { Domain } from "@/lib/jargon/types";
import { DomainActionsDialogs, type SubscriberCheck } from "./domain-actions-dialogs";
import { DomainActionsDropdown } from "./domain-actions-dropdown";

export { DomainMeta } from "./domain-meta";

const DomainExportDialog = dynamic(() =>
  import("./domain-export-dialog").then((mod) => mod.DomainExportDialog),
);
const DomainFormDialog = dynamic(() =>
  import("./domain-form-dialog").then((mod) => mod.DomainFormDialog),
);

type DomainActionsMenuProps = {
  domain: Domain;
  onToggleActiveForReview: () => void;
  togglePending: boolean;
};

export function DomainActionsMenu({
  domain,
  onToggleActiveForReview,
  togglePending,
}: DomainActionsMenuProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  // Set when the export dialog opens; the dialog reads it.
  const [exportTerms, setExportTerms] = useState<Promise<CollectionExport> | null>(null);
  const [shareConfirmOpen, setShareConfirmOpen] = useState(false);
  const [subscriberCheck, setSubscriberCheck] = useState<Promise<SubscriberCheck> | null>(null);
  const [resetProgressOpen, setResetProgressOpen] = useState(false);
  const {
    error,
    isBusy,
    busyId,
    shareDomain,
    unshareDomain,
    deleteOwnedDomain,
    removeFromCollection,
    resetProgress,
  } = useCollectionActions();

  const disabled = togglePending || (isBusy && busyId === domain.id);

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
    setSubscriberCheck(null);
  }

  function handleConfirmResetProgress() {
    resetProgress(domain.id);
    setResetProgressOpen(false);
  }

  return (
    <div className="relative shrink-0">
      <DomainActionsDropdown
        domain={domain}
        disabled={disabled}
        onToggleActiveForReview={onToggleActiveForReview}
        onResetProgress={() => setResetProgressOpen(true)}
        onExport={() => setExportTerms(fetchCollectionExport(domain.id))}
        onEdit={() => setEditOpen(true)}
        onShare={() => setShareConfirmOpen(true)}
        onUnshare={() =>
          setSubscriberCheck(
            getDomainSubscriberCount(domain.id).catch(() => ({
              error: "Couldn't check who else uses this collection. Try again.",
            })),
          )
        }
        onDelete={() => setDeleteOpen(true)}
        onRemoveFromCollection={() => {
          // The Library picks the next collection to show.
          removeFromCollection(domain.id, () => router.push("/jargon"));
        }}
      />

      {/* Their own boundaries, so loading a dialog's code doesn't suspend the page. */}
      {domain.source === "owned" && editOpen ? (
        <Suspense fallback={null}>
          <DomainFormDialog domain={domain} isOpen={editOpen} onOpenChange={setEditOpen} />
        </Suspense>
      ) : null}

      {exportTerms ? (
        <Suspense fallback={null}>
          <DomainExportDialog
            domain={domain}
            terms={exportTerms}
            isOpen
            onOpenChange={(open) => {
              if (!open) setExportTerms(null);
            }}
          />
        </Suspense>
      ) : null}

      <DomainActionsDialogs
        domain={domain}
        shareConfirmOpen={shareConfirmOpen}
        onShareConfirmOpenChange={setShareConfirmOpen}
        onConfirmShare={handleConfirmShare}
        subscriberCheck={subscriberCheck}
        onUnshareClose={() => setSubscriberCheck(null)}
        onConfirmUnshare={handleConfirmUnshare}
        deleteOpen={deleteOpen}
        onDeleteOpenChange={setDeleteOpen}
        onConfirmDelete={handleConfirmDelete}
        resetProgressOpen={resetProgressOpen}
        onResetProgressOpenChange={setResetProgressOpen}
        onConfirmResetProgress={handleConfirmResetProgress}
      />

      {error ? (
        <Alert
          variant="destructive"
          icon={false}
          className="absolute right-0 top-full z-10 mt-2 w-56"
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
