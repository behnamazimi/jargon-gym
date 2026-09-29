import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FeatureId } from "./registry";
import { isSchemaMissing } from "./schema-missing";

type Client = SupabaseClient<Database>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** One provider call made for a person, for reporting and per-person caps. It
 *  never costs credits. A failed write is logged and never fails the request. */
export async function recordUsage(
  admin: Client,
  event: { userId: string; feature: FeatureId; units: number; outcome: "ok" | "failed" },
): Promise<void> {
  const { error } = await admin.from("ai_usage_events").insert({
    user_id: event.userId,
    feature: event.feature,
    units: event.units,
    outcome: event.outcome,
  });
  if (error) console.error("Couldn't record AI usage:", error);
}

/** Provider calls made for this person in the last 24 hours, failed ones
 *  included. If the usage table isn't in the database yet it counts as none. */
export async function countRecentGenerations(
  admin: Client,
  userId: string,
  feature: FeatureId,
): Promise<number> {
  const { count, error } = await admin
    .from("ai_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", feature)
    .gte("created_at", new Date(Date.now() - DAY_MS).toISOString());
  if (error) {
    if (isSchemaMissing(error)) return 0;
    throw error;
  }
  return count ?? 0;
}
