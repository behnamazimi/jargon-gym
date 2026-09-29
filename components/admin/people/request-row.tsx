"use client";

import { useState } from "react";
import { approveWaitlistRequest, resendInvite } from "@/app/(private)/admin/people/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useToast } from "@/components/ui/toast";
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

export function RequestRow({
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
  const { toast } = useToast();
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function handleApprove() {
    setNotice(null);
    void run(() => approveWaitlistRequest(row.id), {
      // The row leaves the Pending list, so a note on it would vanish with it.
      onSuccess: ({ emailSent }) => {
        if (!emailSent)
          toast(`Approved ${row.email}, but the email failed. Use Resend.`, "destructive");
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
