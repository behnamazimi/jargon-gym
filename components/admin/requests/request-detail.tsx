import Link from "next/link";
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin/format";
import {
  ADMIN_DECLINE_REASONS,
  ADMIN_LEVELS,
  ADMIN_STATUS,
  describeRequestShape,
} from "@/lib/admin/requests/labels";
import type { AdminRequestDetail } from "@/lib/admin/requests/queries";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium tracking-wide text-base-content/50 uppercase">{label}</dt>
      <dd className="m-0 text-sm break-words text-base-content">{children}</dd>
    </div>
  );
}

function ConversationFacts({ request }: { request: AdminRequestDetail }) {
  return (
    <>
      {request.level ? (
        <Fact label="Level">{ADMIN_LEVELS[request.level] ?? request.level}</Fact>
      ) : null}
      {request.knownTerms ? (
        <Fact label="Terms they've come across">
          <span className="whitespace-pre-line">{request.knownTerms}</span>
        </Fact>
      ) : null}
      {request.question ? <Fact label="Your question">{request.question}</Fact> : null}
      {request.userReply ? (
        <Fact label="Their reply">
          <span className="whitespace-pre-line">{request.userReply}</span>
        </Fact>
      ) : null}
      {request.declineReason ? (
        <Fact label="Declined">
          {ADMIN_DECLINE_REASONS[request.declineReason] ?? request.declineReason}
          {request.declineNote ? ` · ${request.declineNote}` : ""}
        </Fact>
      ) : null}
    </>
  );
}

function LinkFacts({ request }: { request: AdminRequestDetail }) {
  return (
    <>
      {request.merged.length > 0 ? (
        <Fact label="Merged into this one">
          <ul className="m-0 list-none p-0">
            {request.merged.map((merged) => (
              <li key={merged.id}>
                <Link href={`/admin/requests/${merged.id}`} className="link link-hover">
                  {merged.topic}
                </Link>
              </li>
            ))}
          </ul>
        </Fact>
      ) : null}
      {request.mergedInto ? (
        <Fact label="Follows">
          <Link href={`/admin/requests/${request.mergedInto}`} className="link link-hover">
            Open the request this was merged into
          </Link>
        </Fact>
      ) : null}
      {request.deliveredTerms !== null ? (
        <Fact label="Delivered">
          {request.deliveryKind === "added_shared"
            ? "A shared collection was added to their Library"
            : `${request.deliveredTerms} terms in a private collection`}
        </Fact>
      ) : null}
    </>
  );
}

/** What the person asked for, and where the request stands. Plain facts, no controls. */
export function RequestDetail({ request }: { request: AdminRequestDetail }) {
  const status = ADMIN_STATUS[request.status] ?? { label: request.status, badge: "badge-ghost" };

  return (
    <dl className="m-0 grid gap-4 rounded-lg border border-base-300 p-4 sm:grid-cols-2">
      <Fact label="Status">
        <span className={`badge ${status.badge}`}>{status.label}</span>
        {request.overdue ? (
          <span className="badge badge-warning badge-soft ml-2">Overdue</span>
        ) : null}
        {request.emailFailed ? (
          <span className="badge badge-error badge-soft ml-2">Email failed</span>
        ) : null}
      </Fact>
      <Fact label="Kind">{describeRequestShape(request)}</Fact>
      <Fact label="Requester">
        <Link href={`/admin/people/${request.userId}`} className="link link-hover">
          {request.requesterEmail ?? request.userId}
        </Link>
        {request.notifyEmail ? null : " · email off"}
      </Fact>
      <Fact label="Asked · due">
        {formatAdminDateTime(request.createdAt)} · {formatAdminDate(request.dueAt)}
        {request.delayNotifiedAt ? " (new date sent)" : ""}
      </Fact>
      <ConversationFacts request={request} />
      <LinkFacts request={request} />
    </dl>
  );
}
