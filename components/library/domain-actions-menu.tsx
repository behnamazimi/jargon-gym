"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { getDomainSubscriberCount } from "@/app/(private)/app/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import { fetchCollectionExport, type CollectionExport } from "@/lib/export/fetch-collection-export";
import type { Domain } from "@/lib/terms/types";
import { ReportCollectionDialog } from "./report-collection-dialog";
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
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  // Set when the export dialog opens; the dialog reads it.
  const [exportTerms, setExportTerms] = useState<Promise<CollectionExport> | null>(null);
  const [shareConfirmOpen, setShareConfirmOpen] = useState(false);
  // The check stays set while the dialog closes, so its text doesn't change
  // during the closing animation.
  const [unshare, setUnshare] = useState<{
    check: Promise<SubscriberCheck>;
    open: boolean;
  } | null>(null);
  const [resetProgressOpen, setResetProgressOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState<string | null>(null);
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

  async function handleConfirmDelete() {
    setDeleting(true);
    const deleted = await deleteOwnedDomain(domain.id, () => router.push("/app/library"));
    // On success the dialog stays up until the navigation unmounts this menu.
    if (deleted) return;
    setDeleting(false);
    setDeleteOpen(false);
  }

  function handleConfirmShare() {
    shareDomain(domain.id);
    setShareConfirmOpen(false);
  }

  function handleConfirmUnshare() {
    unshareDomain(domain.id);
    setUnshare((current) => current && { ...current, open: false });
  }

  function handleConfirmResetProgress() {
    resetProgress(domain.id);
    setResetProgressOpen(false);
  }

  return (
    <div className="relative shrink-0">
      <DomainActionsDropdown
        domain={{
          ...domain,
          reportedByMe: domain.reportedByMe || reported === domain.id,
        }}
        disabled={disabled}
        onToggleActiveForReview={onToggleActiveForReview}
        onResetProgress={() => setResetProgressOpen(true)}
        onExport={() => setExportTerms(fetchCollectionExport(domain.id))}
        onEdit={() => setEditOpen(true)}
        onShare={() => setShareConfirmOpen(true)}
        onUnshare={() =>
          setUnshare({
            check: getDomainSubscriberCount(domain.id).catch(() => ({
              error: "Couldn't check who else uses this collection. Try again.",
            })),
            open: true,
          })
        }
        onDelete={() => setDeleteOpen(true)}
        onReport={() => setReportOpen(true)}
        onRemoveFromCollection={() => {
          // The Library picks the next collection to show.
          removeFromCollection(domain.id, () => router.push("/app/library"));
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

      {reportOpen ? (
        <ReportCollectionDialog
          domainId={domain.id}
          domainName={domain.name}
          onReported={() => setReported(domain.id)}
          onClose={() => setReportOpen(false)}
        />
      ) : null}

      <DomainActionsDialogs
        domain={domain}
        shareConfirmOpen={shareConfirmOpen}
        onShareConfirmOpenChange={setShareConfirmOpen}
        onConfirmShare={handleConfirmShare}
        subscriberCheck={unshare?.check ?? null}
        unshareOpen={unshare?.open ?? false}
        onUnshareClose={() => setUnshare((current) => current && { ...current, open: false })}
        onConfirmUnshare={handleConfirmUnshare}
        deleteOpen={deleteOpen}
        deleting={deleting}
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
