"use client";

import { useState } from "react";
import { liftShareLock } from "@/app/(private)/admin/collections/moderation-actions";
import {
  ReportsDialog,
  StopSharingDialog,
  reasonLabel,
} from "@/components/admin/collections/moderation-dialogs";
import { ReasonConfirmDialog } from "@/components/admin/reason-confirm-dialog";
import type { AdminCollectionRow } from "@/lib/admin/collections/list-all-collections";

export function ModerationBadges({ collection }: { collection: AdminCollectionRow }) {
  const { shareBlockedAt, shareBlockReason, openReportCount } = collection;
  return (
    <>
      {shareBlockedAt && shareBlockReason ? (
        <span className="badge badge-warning badge-sm mt-1 block whitespace-nowrap">
          Sharing locked: {reasonLabel(shareBlockReason)}
        </span>
      ) : null}
      {openReportCount > 0 ? (
        <span className="badge badge-error badge-soft badge-sm mt-1 block whitespace-nowrap">
          {openReportCount} {openReportCount === 1 ? "report" : "reports"}
        </span>
      ) : null}
    </>
  );
}

type Dialog = "stop" | "lift" | "reports";

function ActionButton({
  label,
  onPress,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={danger ? "btn btn-error btn-sm" : "btn btn-sm"}
      onClick={onPress}
    >
      {label}
    </button>
  );
}

export function ModerationActions({ collection }: { collection: AdminCollectionRow }) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);
  const canStop =
    collection.visibility === "shared" && !collection.isBuiltin && !collection.readOnly;

  return (
    <div className="flex flex-wrap gap-1">
      {collection.openReportCount > 0 ? (
        <ActionButton label="Reports" onPress={() => setDialog("reports")} />
      ) : null}
      {canStop ? (
        <ActionButton label="Stop sharing" danger onPress={() => setDialog("stop")} />
      ) : null}
      {collection.shareBlockedAt ? (
        <ActionButton label="Lift lock" onPress={() => setDialog("lift")} />
      ) : null}
      {dialog === "stop" ? <StopSharingDialog collection={collection} onClose={close} /> : null}
      {dialog === "reports" ? <ReportsDialog collection={collection} onClose={close} /> : null}
      {dialog === "lift" ? (
        <ReasonConfirmDialog
          title="Lift the sharing lock"
          description={`The owner can share “${collection.name}” again. Nothing is restored, and nobody gets it back automatically.`}
          confirmLabel="Lift lock"
          onSubmit={({ reason }) => liftShareLock(collection.id, reason)}
          onClose={close}
        />
      ) : null}
    </div>
  );
}
