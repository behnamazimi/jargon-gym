"use client";

import { useState, useTransition } from "react";
import { approveWaitlistRequest, resendInvite } from "@/app/(private)/admin/invites/actions";
import { AdminNav } from "@/components/jargon/admin/admin-nav";
import type {
  AdminWaitlistRow,
  AdminWaitlistStatus,
} from "@/lib/jargon/admin/list-waitlist-requests";
import { cn } from "@/lib/utils";

type AdminInvitesPageClientProps = {
  requests: AdminWaitlistRow[];
};

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

export function AdminInvitesPageClient({ requests }: AdminInvitesPageClientProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <AdminNav />

      <div className="max-md:sr-only">
        <h1 className="text-2xl font-semibold text-base-content">Invites</h1>
        <p className="mt-1 text-base text-base-content/65">
          Approve waitlist requests to generate a referral code and email a signup link.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Status</th>
              <th>Requested</th>
              <th></th>
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
    </div>
  );
}

function RequestRow({ request }: { request: AdminWaitlistRow }) {
  const [status, setStatus] = useState(request.status);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [isApproved, setIsApproved] = useState(false);

  function handleApprove() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await approveWaitlistRequest(request.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setIsApproved(true);
      if (!result.data.emailSent) {
        setError("Approved, but the email failed. Use Resend.");
      }
      setTimeout(() => setStatus("invited"), 150);
    });
  }

  function handleResend() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await resendInvite(request.id);
      if (result.ok) {
        setNotice("Sent again.");
        return;
      }
      setError(result.error);
      if (result.error.startsWith("They already") || result.error.includes("no longer active")) {
        setCanResend(false);
      }
    });
  }

  return (
    <tr>
      <td className="font-medium text-base-content">{request.email}</td>
      <td>
        <span className={`badge ${statusBadgeClass[status]}`}>{statusLabel[status]}</span>
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
      <td className="text-base-content/65">{new Date(request.createdAt).toLocaleDateString()}</td>
      <td className="text-right">
        {status === "pending" ? (
          <button
            type="button"
            className={cn(
              "btn btn-sm btn-primary transition-[opacity,transform] duration-150 ease-out active:scale-[0.96]",
              isApproved && "-translate-y-1 opacity-0",
            )}
            disabled={isPending}
            onClick={handleApprove}
          >
            {isPending ? "Approving…" : "Approve"}
          </button>
        ) : null}
        {status === "invited" && canResend ? (
          <button
            type="button"
            className="btn btn-sm btn-ghost transition-transform active:scale-[0.96]"
            disabled={isPending}
            onClick={handleResend}
          >
            {isPending ? "Sending…" : "Resend"}
          </button>
        ) : null}
      </td>
    </tr>
  );
}
