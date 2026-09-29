"use client";

import { useState } from "react";
import { approveWaitlistRequest, resendInvite } from "@/app/(private)/admin/invites/actions";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useAdminAction } from "@/hooks/use-admin-action";
import { formatAdminDate } from "@/lib/admin/format";
import type {
  AdminWaitlistRow,
  AdminWaitlistStatus,
} from "@/lib/jargon/admin/list-waitlist-requests";

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

export function AdminInvitesPageClient({ requests }: { requests: AdminWaitlistRow[] }) {
  return (
    <>
      <AdminPageHeader
        title="Invites"
        description="Approve waitlist requests to generate a referral code and email a signup link."
      />

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Status</th>
              <th>Requested</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <RequestRow key={request.id} request={request} />
            ))}
            {requests.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-base-content/50">
                  No waitlist requests yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RequestRow({ request }: { request: AdminWaitlistRow }) {
  const { run, isPending, error, clearError } = useAdminAction();
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function handleApprove() {
    setNotice(null);
    void run(() => approveWaitlistRequest(request.id), {
      onSuccess: ({ emailSent }) => {
        if (!emailSent) setNotice("Approved, but the email failed. Use Resend.");
      },
    });
  }

  async function handleResend() {
    setNotice(null);
    if (await run(() => resendInvite(request.id))) setNotice("Sent again.");
  }

  return (
    <tr>
      <td className="font-medium text-base-content">{request.email}</td>
      <td>
        <span className={`badge ${statusBadgeClass[request.status]}`}>
          {statusLabel[request.status]}
        </span>
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
      <td className="text-base-content/65">{formatAdminDate(request.createdAt)}</td>
      <td className="text-right">
        {request.status === "pending" ? (
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
        {request.status === "invited" ? (
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
        description={`This emails a signup link to ${request.email}.`}
        confirmLabel="Approve and email"
        onConfirm={handleApprove}
      />
    </tr>
  );
}
