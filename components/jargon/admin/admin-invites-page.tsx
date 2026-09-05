"use client";

import { useState, useTransition } from "react";
import { approveWaitlistRequest } from "@/app/(private)/admin/invites/actions";
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
                  No pending requests.
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
  const [isPending, startTransition] = useTransition();

  const [isApproved, setIsApproved] = useState(false);

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      try {
        await approveWaitlistRequest(request.id);
        setIsApproved(true);
        setTimeout(() => setStatus("invited"), 150);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to approve.");
      }
    });
  }

  return (
    <tr>
      <td className="font-medium text-base-content">{request.email}</td>
      <td>
        <span className={`badge ${statusBadgeClass[status]}`}>{statusLabel[status]}</span>
        {error ? <p className="mt-1 text-sm text-error">{error}</p> : null}
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
      </td>
    </tr>
  );
}
