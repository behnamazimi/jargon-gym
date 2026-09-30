"use client";

import {
  addToNarrationAllowlist,
  removeFromNarrationAllowlist,
} from "@/app/(private)/admin/ai/narration/actions";
import { approveWaitlistRequest, resendInvite } from "@/app/(private)/admin/people/actions";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { useToast } from "@/components/ui/toast";
import { useAdminAction } from "@/hooks/use-admin-action";
import type { AdminPerson } from "@/lib/admin/people/person";

function WaitlistRow({ person }: { person: AdminPerson }) {
  const { run, isPending, error } = useAdminAction();
  const { toast } = useToast();
  const { waitlist } = person;

  if (!waitlist) {
    return <p className="m-0 text-sm text-base-content/65">No waitlist request for this email.</p>;
  }

  if (waitlist.status === "pending") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-base-content/65">Waiting for approval.</span>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={isPending}
          onClick={() =>
            void run(() => approveWaitlistRequest(waitlist.id), {
              onSuccess: ({ emailSent }) => {
                if (!emailSent) toast("Approved, but the email failed. Use Resend.", "destructive");
              },
              successMessage: "Invite approved.",
            })
          }
        >
          {isPending ? "Approving…" : "Approve"}
        </button>
        {error ? (
          <p role="alert" className="m-0 w-full text-sm text-error">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (waitlist.status === "invited") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-base-content/65">Invited. They haven&apos;t signed up.</span>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={isPending}
          onClick={() =>
            void run(() => resendInvite(waitlist.id), { successMessage: "Sent again." })
          }
        >
          {isPending ? "Sending…" : "Resend invite"}
        </button>
        {error ? (
          <p role="alert" className="m-0 w-full text-sm text-error">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return <p className="m-0 text-sm text-base-content/65">Signed up from the waitlist.</p>;
}

export function AccessSection({ person }: { person: AdminPerson }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-base-300 px-4 py-4">
      <div className="flex flex-col gap-2">
        <h3 className="m-0 text-sm font-semibold">Waitlist</h3>
        <WaitlistRow person={person} />
        {person.referralVerified ? null : (
          <p className="m-0 text-sm text-warning">
            They have an account but haven&apos;t finished signing up with a reference code.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="m-0 text-sm font-semibold">Narration</h3>
        <div className="flex items-center gap-3">
          <AdminSwitch
            label={`Narration for ${person.email}`}
            value={person.narration === "on"}
            save={(next) =>
              next ? addToNarrationAllowlist(person.email) : removeFromNarrationAllowlist(person.id)
            }
          />
          <span className="text-sm text-base-content/65">
            {person.narration === "partly"
              ? "Partly on (only one of terms and stories). Turning it on allows both."
              : person.narration === "on"
                ? "Can play narration when it is switched on."
                : "Can't play narration."}
          </span>
        </div>
      </div>
    </div>
  );
}
