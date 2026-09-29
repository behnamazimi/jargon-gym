"use client";

import { useState } from "react";
import {
  approveWaitlistRequest,
  approveWaitlistRequests,
  resendInvite,
} from "@/app/(private)/admin/people/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useAdminAction } from "@/hooks/use-admin-action";
import { formatAdminDate } from "@/lib/admin/format";
import type { AdminWaitlistRow, AdminWaitlistStatus } from "@/lib/admin/people/waitlist";

const statusBadgeClass: Record<AdminWaitlistStatus, string> = {
  pending: "badge-neutral",
  invited: "badge-info",
  signed_up: "badge-success",
};

const statusLabel: Record<AdminWaitlistStatus, string> = {
  pending: "Pending",
  invited: "Invited",
  signed_up: "Signed up",
};

const BULK_LIMIT = 10;

export function WaitlistTable({ rows }: { rows: AdminWaitlistRow[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const { run, isPending, error, clearError } = useAdminAction();

  const pendingRows = rows.filter((row) => row.status === "pending");
  const pending = pendingRows.slice(0, BULK_LIMIT);
  // A request approved one by one stops counting, whatever was ticked.
  const chosen = selected.filter((id) => pendingRows.some((row) => row.id === id));
  const allSelected = pending.length > 0 && pending.every((row) => chosen.includes(row.id));

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((other) => other !== id) : [...current, id],
    );
  }

  function handleBulk() {
    setSummary(null);
    void run(() => approveWaitlistRequests(chosen), {
      onSuccess: ({ approved, emailFailed, failed }) => {
        setSelected([]);
        const parts = [`Approved ${approved}.`];
        if (emailFailed.length > 0) {
          parts.push(`Email failed for ${emailFailed.join(", ")}: use Resend.`);
        }
        if (failed.length > 0) parts.push(`${failed.length} couldn't be approved.`);
        setSummary(parts.join(" "));
      },
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={chosen.length === 0 || isPending}
          onClick={() => {
            clearError();
            setConfirming(true);
          }}
        >
          {isPending ? "Approving…" : `Approve selected (${chosen.length})`}
        </button>
        <p className="m-0 text-sm text-base-content/65">
          Select up to {BULK_LIMIT} pending requests on this page.
        </p>
      </div>
      <div aria-live="polite">
        {error ? (
          <p role="alert" className="m-0 text-sm text-error">
            {error}
          </p>
        ) : null}
        {summary ? <p className="m-0 text-sm text-base-content/65">{summary}</p> : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table">
          <thead>
            <tr>
              <th className="w-10">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  aria-label="Select all pending requests on this page"
                  checked={allSelected}
                  disabled={pending.length === 0}
                  onChange={() => setSelected(allSelected ? [] : pending.map((row) => row.id))}
                />
              </th>
              <th>Email</th>
              <th>Status</th>
              <th>Requested</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <RequestRow
                key={row.id}
                row={row}
                selected={chosen.includes(row.id)}
                selectable={
                  row.status === "pending" &&
                  (chosen.includes(row.id) || chosen.length < BULK_LIMIT)
                }
                onToggle={() => toggle(row.id)}
              />
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-base-content/50">
                  No requests here.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={confirming}
        onOpenChange={setConfirming}
        title={`Approve ${chosen.length} ${chosen.length === 1 ? "request" : "requests"}?`}
        description="This emails a signup link to each of them."
        confirmLabel="Approve and email"
        onConfirm={handleBulk}
      />
    </div>
  );
}

function RequestRow({
  row,
  selected,
  selectable,
  onToggle,
}: {
  row: AdminWaitlistRow;
  selected: boolean;
  selectable: boolean;
  onToggle: () => void;
}) {
  const { run, isPending, error, clearError } = useAdminAction();
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function handleApprove() {
    setNotice(null);
    void run(() => approveWaitlistRequest(row.id), {
      onSuccess: ({ emailSent }) => {
        if (!emailSent) setNotice("Approved, but the email failed. Use Resend.");
      },
    });
  }

  async function handleResend() {
    setNotice(null);
    if (await run(() => resendInvite(row.id))) setNotice("Sent again.");
  }

  return (
    <tr>
      <td>
        {row.status === "pending" ? (
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            aria-label={`Select ${row.email}`}
            checked={selected}
            disabled={!selectable}
            onChange={onToggle}
          />
        ) : null}
      </td>
      <td className="font-medium text-base-content">{row.email}</td>
      <td>
        <span className={`badge ${statusBadgeClass[row.status]}`}>{statusLabel[row.status]}</span>
        {error ? (
          <p role="alert" className="mt-1 text-sm text-error">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="mt-1 text-sm text-base-content/65">
            {notice}
          </p>
        ) : null}
      </td>
      <td className="text-base-content/65">{formatAdminDate(row.createdAt)}</td>
      <td className="text-right">
        {row.status === "pending" ? (
          <button
            type="button"
            className="btn btn-sm btn-primary transition-transform active:scale-[0.96]"
            disabled={isPending}
            onClick={() => {
              clearError();
              setConfirming(true);
            }}
          >
            {isPending ? "Approving…" : "Approve"}
          </button>
        ) : null}
        {row.status === "invited" ? (
          <button
            type="button"
            className="btn btn-sm btn-ghost transition-transform active:scale-[0.96]"
            disabled={isPending}
            onClick={() => void handleResend()}
          >
            {isPending ? "Sending…" : "Resend"}
          </button>
        ) : null}
      </td>
      <ConfirmDialog
        isOpen={confirming}
        onOpenChange={setConfirming}
        title="Approve this request?"
        description={`This emails a signup link to ${row.email}.`}
        confirmLabel="Approve and email"
        onConfirm={handleApprove}
      />
    </tr>
  );
}
