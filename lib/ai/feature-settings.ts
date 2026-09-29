import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FeatureId } from "./registry";

type Client = SupabaseClient<Database>;

export type AccessMode = "everyone" | "allowlist" | "admin";

export type FeatureSettings = {
  feature: FeatureId;
  billable: boolean;
  enabled: boolean;
  accessMode: AccessMode;
  /** Rolling 24 hours, per user. Null means no cap. */
  dailyCap: number | null;
  creditCost: number | null;
  unit: string;
};

export type FeaturePolicyResult =
  | { usable: true }
  | { usable: false; reason: "disabled" | "not-allowed" };

export async function getFeatureSettings(
  client: Client,
  feature: FeatureId,
): Promise<FeatureSettings | null> {
  const { data, error } = await client
    .from("ai_feature_settings")
    .select("feature, billable, enabled, access_mode, daily_cap, credit_cost, unit")
    .eq("feature", feature)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    feature,
    billable: data.billable,
    enabled: data.enabled,
    accessMode: data.access_mode as AccessMode,
    dailyCap: data.daily_cap,
    creditCost: data.credit_cost,
    unit: data.unit,
  };
}

/** Needs the admin (service) client: the allowlist table is only readable by
 *  admins, so a user-scoped client always answers false. */
export async function isOnFeatureAllowlist(
  client: Client,
  feature: FeatureId,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("ai_feature_allowlist")
    .select("user_id")
    .eq("feature", feature)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

/** The feature switch blocks everyone, admins included. Past it, admins are
 *  always let in, `allowlist` needs a row, and `admin` lets nobody else in. */
export function checkFeaturePolicy(
  settings: FeatureSettings,
  who: { isAdmin: boolean; onAllowlist: boolean },
): FeaturePolicyResult {
  if (!settings.enabled) return { usable: false, reason: "disabled" };
  if (who.isAdmin || settings.accessMode === "everyone") return { usable: true };
  if (settings.accessMode === "allowlist" && who.onAllowlist) return { usable: true };
  return { usable: false, reason: "not-allowed" };
}
