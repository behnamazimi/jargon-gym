import type { SupabaseClient } from "@supabase/supabase-js";
import { exactEmailPattern } from "@/lib/admin/email-lookup";
import { listAuditForPerson, type AuditRow } from "@/lib/admin/audit-query";
import type { AdminWaitlistStatus } from "@/lib/admin/people/waitlist";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

type NarrationAccess = "on" | "off" | "partly";

export type PersonLedgerRow = {
  id: number;
  kind: "spend" | "refund" | "grant" | "reset";
  feature: string | null;
  amount: number;
  note: string | null;
  createdAt: string;
};

type PersonWaitlist = { id: string; status: AdminWaitlistStatus };

export type AdminPerson = {
  id: string;
  email: string;
  role: "admin" | "member";
  createdAt: string;
  suspendedAt: string | null;
  referralVerified: boolean;
  /** The sign-in ban and the suspended flag disagree, which only a hand edit can cause. */
  banMismatch: boolean;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  ownedCollections: number;
  /** Other people with something that would be deleted along with this person's collections. */
  peopleUsingCollections: number;
  /** Null when the balance couldn't be read. */
  credits: { remaining: number; total: number } | null;
  narration: NarrationAccess;
  waitlist: PersonWaitlist | null;
  ledger: PersonLedgerRow[];
  history: AuditRow[];
};

const LEDGER_LIMIT = 20;
const HISTORY_LIMIT = 10;

/** On only when both narration features are allowed. One of two is a state the
 *  page can't produce, so it is shown as it is. */
export function narrationAccess(featuresAllowed: number): NarrationAccess {
  if (featuresAllowed >= 2) return "on";
  return featuresAllowed === 1 ? "partly" : "off";
}

/** Admins are managed in the database, and nobody acts on their own account here. */
export function canModifyPerson(person: Pick<AdminPerson, "id" | "role">, adminId: string) {
  return person.role === "member" && person.id !== adminId;
}

async function findWaitlist(client: Client, email: string): Promise<PersonWaitlist | null> {
  const { data, error } = await client
    .from("waitlist_requests")
    .select("id, status, referral_codes(used_at)")
    .ilike("email", exactEmailPattern(email))
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const base = data.status as "pending" | "invited";
  return {
    id: data.id,
    status: base === "invited" && data.referral_codes?.used_at ? "signed_up" : base,
  };
}

async function listLedger(client: Client, userId: string): Promise<PersonLedgerRow[]> {
  const { data, error } = await client
    .from("ai_credit_ledger")
    .select("id, kind, feature, amount, note, created_at")
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(LEDGER_LIMIT);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as PersonLedgerRow["kind"],
    feature: row.feature,
    amount: row.amount,
    note: row.note,
    createdAt: row.created_at,
  }));
}

function readCredits(balance: { data: unknown; error: unknown }): AdminPerson["credits"] {
  if (balance.error) {
    console.error("Couldn't read an AI credit balance:", balance.error);
    return null;
  }
  const row = (balance.data as { remaining: number; total: number }[] | null)?.[0];
  return row ? { remaining: row.remaining, total: row.total } : null;
}

/** One person for their page. Their balance is only readable with the server's own
 *  client, so `service` must only be used after the admin check. */
export async function getPerson(
  client: Client,
  service: Client,
  userId: string,
): Promise<AdminPerson | null> {
  const { data: user, error } = await client
    .from("users")
    .select("id, email, role, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!user) return null;

  const [allowed, detail, balance, waitlist, ledger] = await Promise.all([
    client
      .from("ai_feature_allowlist")
      .select("feature")
      .eq("user_id", userId)
      .in("feature", ["narration_term", "narration_story"]),
    client.rpc("admin_person_detail", { p_user_id: userId }),
    service.rpc("ai_credit_balance", { p_user_id: userId }),
    findWaitlist(client, user.email),
    listLedger(client, userId),
  ]);
  if (allowed.error) throw allowed.error;
  if (detail.error) throw detail.error;
  const info = detail.data?.[0];
  if (!info) return null;

  const history = await listAuditForPerson(client, {
    userId,
    waitlistRequestId: waitlist?.id ?? null,
    limit: HISTORY_LIMIT,
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
    suspendedAt: info.suspended_at,
    referralVerified: info.referral_verified,
    banMismatch: info.ban_mismatch,
    currentStreak: info.current_streak,
    longestStreak: info.longest_streak,
    lastActiveDate: info.last_active_date,
    ownedCollections: info.owned_collections,
    peopleUsingCollections: info.people_using_collections,
    credits: readCredits(balance),
    narration: narrationAccess(allowed.data?.length ?? 0),
    waitlist,
    ledger,
    history,
  };
}
