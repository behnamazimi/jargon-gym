"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import { fetchCollectionExport, type CollectionExport } from "@/lib/export/fetch-collection-export";
import type { Collection } from "@/lib/terms/types";
import { ReportCollectionDialog } from "./report-collection-dialog";
import { CollectionActionsDialogs } from "./collection-actions-dialogs";
import { CollectionActionsDropdown } from "./collection-actions-dropdown";

export { CollectionMeta } from "./collection-meta";

const CollectionExportDialog = dynamic(() =>
  import("./collection-export-dialog").then((mod) => mod.CollectionExportDialog),
);
const CollectionFormDialog = dynamic(() =>
  import("./collection-form-dialog").then((mod) => mod.CollectionFormDialog),
);

type CollectionActionsMenuProps = {
  collection: Collection;
  onToggleActiveForReview: () => void;
  togglePending: boolean;
};

export function CollectionActionsMenu({
  collection,
  onToggleActiveForReview,
  togglePending,
}: CollectionActionsMenuProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  // Set when the export dialog opens; the dialog reads it.
  const [exportTerms, setExportTerms] = useState<Promise<CollectionExport> | null>(null);
  const [resetProgressOpen, setResetProgressOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState<string | null>(null);
  const { error, isBusy, busyId, deleteOwnedCollection, removeFromCollection, resetProgress } =
    useCollectionActions();

  const disabled = togglePending || (isBusy && busyId === collection.id);

  async function handleConfirmDelete() {
    setDeleting(true);
    const deleted = await deleteOwnedCollection(collection.id, () => router.push("/app/library"));
    // On success the dialog stays up until the navigation unmounts this menu.
    if (deleted) return;
    setDeleting(false);
    setDeleteOpen(false);
  }

  function handleConfirmResetProgress() {
    resetProgress(collection.id);
    setResetProgressOpen(false);
  }

  return (
    <div className="relative shrink-0">
      <CollectionActionsDropdown
        collection={{
          ...collection,
          reportedByMe: collection.reportedByMe || reported === collection.id,
        }}
        disabled={disabled}
        onToggleActiveForReview={onToggleActiveForReview}
        onResetProgress={() => setResetProgressOpen(true)}
        onExport={() => setExportTerms(fetchCollectionExport(collection.id))}
        onEdit={() => setEditOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        onReport={() => setReportOpen(true)}
        onRemoveFromCollection={() => {
          // The Library picks the next collection to show.
          removeFromCollection(collection.id, () => router.push("/app/library"));
        }}
      />

      {/* Their own boundaries, so loading a dialog's code doesn't suspend the page. */}
      {collection.source === "owned" && editOpen ? (
        <Suspense fallback={null}>
          <CollectionFormDialog
            collection={collection}
            isOpen={editOpen}
            onOpenChange={setEditOpen}
          />
        </Suspense>
      ) : null}

      {exportTerms ? (
        <Suspense fallback={null}>
          <CollectionExportDialog
            collection={collection}
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
          collectionId={collection.id}
          collectionName={collection.name}
          onReported={() => setReported(collection.id)}
          onClose={() => setReportOpen(false)}
        />
      ) : null}

      <CollectionActionsDialogs
        collection={collection}
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
