import type { SupabaseClient } from "@supabase/supabase-js";
import { runWithCredits, type ChargeOutcome } from "@/lib/ai-credits/charge";
import type { Database } from "@/lib/supabase/database.types";
import type { BillableFeatureId } from "./registry";

type Client = SupabaseClient<Database>;

export type MeteredOutcome<T> = ChargeOutcome<T> | { charged: false; reason: "busy" };

type MeteredInput = {
  admin: Client;
  userId: string;
  feature: BillableFeatureId;
  cost: number;
};

/** A run that never ends (the process was killed) frees itself after this. */
const RUN_TTL_SECONDS = 120;

/** Charges credits around one AI call, allowing a single running request per
 *  user and feature. The guard is taken first, so a second click never gets
 *  charged. Narration must not use this: it is never billed. */
export async function runMetered<T>(
  { admin, userId, feature, cost }: MeteredInput,
  run: () => Promise<T>,
): Promise<MeteredOutcome<T>> {
  const { data: token, error } = await admin.rpc("begin_ai_run", {
    p_user_id: userId,
    p_feature: feature,
    p_ttl_seconds: RUN_TTL_SECONDS,
  });
  if (error) throw error;
  if (!token) return { charged: false, reason: "busy" };

  try {
    return await runWithCredits({ admin, userId, feature, cost }, run);
  } finally {
    const { error: endError } = await admin.rpc("end_ai_run", {
      p_user_id: userId,
      p_feature: feature,
      p_token: token,
    });
    if (endError) console.error("Couldn't release the AI run guard:", endError);
  }
}
