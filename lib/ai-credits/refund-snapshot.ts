import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { refundsLookHigh } from "./health";

type LedgerRow = { kind: string; user_id: string; note: string | null };

export type RefundSnapshot = {
  high: boolean;
  spends24h: number;
  refunds24h: number;
  refundUsers24h: number;
  topReason: string | null;
};

/** The last day's spends and refunds, judged by the same rule as the admin
 *  overview. Rows are counted here because the admin summary function only
 *  answers to a signed-in admin. */
export function summarizeLedger(rows: LedgerRow[]): RefundSnapshot {
  const refunds = rows.filter((row) => row.kind === "refund");
  const refundUsers24h = new Set(refunds.map((row) => row.user_id)).size;
  const summary = {
    spends24h: rows.filter((row) => row.kind === "spend").length,
    refunds24h: refunds.length,
    refundUsers24h,
  };

  const reasons = new Map<string, number>();
  for (const refund of refunds) {
    const reason = refund.note ?? "Unknown reason";
    reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
  }
  const [topReason] = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null];

  return { ...summary, high: refundsLookHigh(summary), topReason };
}

export async function loadRefundSnapshot(admin: SupabaseClient<Database>): Promise<RefundSnapshot> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("ai_credit_ledger")
    .select("kind, user_id, note")
    .in("kind", ["spend", "refund"])
    .gte("created_at", since)
    .limit(5000);
  if (error) throw error;
  return summarizeLedger(data ?? []);
}
