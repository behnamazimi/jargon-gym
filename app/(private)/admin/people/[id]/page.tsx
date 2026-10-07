import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSection } from "@/components/admin/admin-section";
import { AdminStat } from "@/components/admin/admin-stat";
import { AccessSection } from "@/components/admin/people/person/access-section";
import { AiSection } from "@/components/admin/people/person/ai-section";
import { DangerZone } from "@/components/admin/people/person/danger-zone";
import { HistoryList } from "@/components/admin/people/person/history-list";
import { LedgerTable } from "@/components/admin/people/person/ledger-table";
import { formatAdminDate } from "@/lib/admin/format";
import { isUuid } from "@/lib/admin/list-params";
import { requireAdminPage } from "@/lib/admin/page-guard";
import { canModifyPerson, getPerson } from "@/lib/admin/people/person";
import { createAdminClient } from "@/lib/supabase/admin";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminPersonPage({ params }: PageProps) {
  const { supabase, user } = await requireAdminPage();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const person = await getPerson(supabase, createAdminClient(), id);
  if (!person) notFound();

  const isYou = person.id === user.id;

  return (
    <>
      <Link href="/admin/people?view=members" className="link text-sm">
        ← Members
      </Link>
      <AdminPageHeader
        title={person.email}
        description={`Joined ${formatAdminDate(person.createdAt)}${isYou ? " · This is you." : ""}`}
        actions={
          <div className="flex gap-2">
            <span className={`badge ${person.role === "admin" ? "badge-primary" : "badge-ghost"}`}>
              {person.role}
            </span>
            {person.suspendedAt ? <span className="badge badge-error">suspended</span> : null}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AdminStat label="Current streak" value={person.currentStreak} />
        <AdminStat label="Longest streak" value={person.longestStreak} />
        <AdminStat label="Last active" value={person.lastActiveDate ?? "—"} />
        <AdminStat label="Collections" value={person.ownedCollections} />
      </div>

      <AdminSection id="access" title="Access">
        <AccessSection person={person} />
      </AdminSection>

      <AdminSection id="ai" title="AI">
        <AiSection person={person} />
        <LedgerTable rows={person.ledger} />
      </AdminSection>

      <AdminSection id="history" title="Recent admin actions">
        <HistoryList rows={person.history} />
      </AdminSection>

      <AdminSection id="danger" title="Danger zone">
        {canModifyPerson(person, user.id) ? (
          <DangerZone person={person} />
        ) : (
          <p className="m-0 text-sm text-base-content/65">
            {isYou
              ? "You can't suspend or delete your own account."
              : "Admin accounts can't be suspended or deleted here. Change their role in the database first."}
          </p>
        )}
      </AdminSection>
    </>
  );
}
