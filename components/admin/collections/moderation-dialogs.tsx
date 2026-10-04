"use client";

import { Suspense, use, useState } from "react";
import {
  dismissCollectionReports,
  listCollectionReports,
  stopSharingCollection,
} from "@/app/(private)/admin/collections/moderation-actions";
import { RequestDialog } from "@/components/admin/requests/request-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAdminAction } from "@/hooks/use-admin-action";
import type { ActionResult } from "@/lib/admin/action";
import type { AdminCollectionRow } from "@/lib/admin/collections/list-all-collections";
import { formatAdminDate } from "@/lib/admin/format";
import { settleAdminAction } from "@/lib/admin/settle-action";
import {
  isReportReason,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  TAKEDOWN_NOTE_MAX,
  type ReportReason,
} from "@/lib/collections/moderation";

export function reasonLabel(reason: string) {
  return isReportReason(reason) ? REPORT_REASON_LABELS[reason] : reason;
}

export function StopSharingDialog({
  collection,
  onClose,
}: {
  collection: AdminCollectionRow;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [note, setNote] = useState("");

  return (
    <RequestDialog
      title="Stop sharing this collection"
      description={`“${collection.name}” is removed from everyone else's library, without telling them. The owner can't share it again until you lift the lock, and sees only the reason you choose.`}
      confirmLabel="Stop sharing"
      canSubmit={reason !== "" && note.trim().length > 0}
      onSubmit={() => stopSharingCollection({ domainId: collection.id, reason, note })}
      onClose={onClose}
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm">Reason (shown to the owner)</span>
        <select
          className="select select-bordered w-full"
          value={reason}
          onChange={(event) => setReason(event.target.value as ReportReason | "")}
        >
          <option value="">Choose…</option>
          {REPORT_REASONS.map((value) => (
            <option key={value} value={value}>
              {REPORT_REASON_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">Note (kept in the audit log only)</span>
        <input
          className="input input-bordered w-full"
          maxLength={TAKEDOWN_NOTE_MAX}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
    </RequestDialog>
  );
}

type Reports = Extract<Awaited<ReturnType<typeof listCollectionReports>>, { ok: true }>["data"];

function ReportList({ loading }: { loading: Promise<ActionResult<Reports>> }) {
  const result = use(loading);
  if (!result.ok) {
    return (
      <p role="alert" className="m-0 text-sm text-error">
        {result.error}
      </p>
    );
  }
  return <ReportItems reports={result.data} />;
}

function ReportItems({ reports }: { reports: Reports }) {
  if (reports.length === 0) return <p className="m-0 text-sm">No reports.</p>;
  return (
    <ul className="m-0 flex max-h-72 list-none flex-col gap-3 overflow-y-auto p-0">
      {reports.map((report) => (
        <li key={report.id} className="flex flex-col gap-0.5 text-sm">
          <span className="font-medium">
            {reasonLabel(report.reason)}
            {report.status === "open" ? null : (
              <span className="badge badge-ghost badge-sm ml-2">{report.status}</span>
            )}
          </span>
          {report.note ? <span className="wrap-anywhere">{report.note}</span> : null}
          <span className="text-base-content/65">
            {report.reporterEmail ?? "Deleted account"} · {formatAdminDate(report.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Mount it only while it is open: it reads the reports when it opens. */
export function ReportsDialog({
  collection,
  onClose,
}: {
  collection: AdminCollectionRow;
  onClose: () => void;
}) {
  const [loading] = useState(() => settleAdminAction(() => listCollectionReports(collection.id)));
  const { run, isPending, error } = useAdminAction();

  async function dismiss() {
    if (await run(() => dismissCollectionReports(collection.id))) onClose();
  }

  return (
    <AlertDialog
      isOpen
      isDismissable={!isPending}
      onOpenChange={(open) => {
        if (!open && !isPending) onClose();
      }}
    >
      <AlertDialogHeader>
        <AlertDialogTitle>Reports on {collection.name}</AlertDialogTitle>
        <AlertDialogDescription>
          Dismissing closes the open reports. A later report opens a new one.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <Suspense fallback={<p className="m-0 text-sm">Loading…</p>}>
        <ReportList loading={loading} />
      </Suspense>
      {error ? (
        <p role="alert" className="m-0 text-sm text-error">
          {error}
        </p>
      ) : null}
      <AlertDialogFooter>
        <AlertDialogCancel isDisabled={isPending}>Close</AlertDialogCancel>
        <Button type="button" isDisabled={isPending} onPress={dismiss}>
          {isPending ? "Working…" : "Dismiss reports"}
        </Button>
      </AlertDialogFooter>
    </AlertDialog>
  );
}
