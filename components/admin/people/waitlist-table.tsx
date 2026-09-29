"use client";

import { useState } from "react";
import { approveWaitlistRequests } from "@/app/(private)/admin/people/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useAdminAction } from "@/hooks/use-admin-action";
import { RequestRow } from "@/components/admin/people/request-row";
import type { AdminWaitlistRow } from "@/lib/admin/people/waitlist";

const BULK_LIMIT = 10;

export function WaitlistTable({ rows }: { rows: AdminWaitlistRow[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [failures, setFailures] = useState<string[]>([]);
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
    setFailures([]);
    void run(() => approveWaitlistRequests(chosen), {
      onSuccess: ({ approved, emailFailed, failed }) => {
        setSelected([]);
        const parts = [`Approved ${approved}.`];
        if (emailFailed.length > 0) {
          parts.push(`Email failed for ${emailFailed.join(", ")}: use Resend.`);
        }
        if (failed.length > 0) parts.push(`${failed.length} couldn't be approved:`);
        setFailures(failed.map((item) => `${item.email ?? item.id}: ${item.error}`));
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
        {failures.length > 0 ? (
          <ul className="m-0 mt-1 list-disc pl-5 text-sm text-error">
            {failures.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
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
