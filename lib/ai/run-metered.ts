import type { SupabaseClient } from "@supabase/supabase-js";
import { runWithCredits, type ChargeOutcome } from "@/lib/ai-credits/charge";
import type { Database } from "@/lib/supabase/database.types";
import type { BillableFeatureId } from "./registry";
import { withRunGuard } from "./run-guard";

type Client = SupabaseClient<Database>;

export type MeteredOutcome<T> = ChargeOutcome<T> | { charged: false; reason: "busy" };

type MeteredInput = {
  admin: Client;
  userId: string;
  feature: BillableFeatureId;
  units: number;
};

/** Charges credits around one AI call, allowing a single running request per
 *  user and feature. The guard is taken first, so a second click never gets
 *  charged. Story narration bills through its own hook instead (it must only charge
 *  the request that wins the clip). */
export async function runMetered<T>(
  { admin, userId, feature, units }: MeteredInput,
  run: (charge: { ledgerId: number }) => Promise<T>,
): Promise<MeteredOutcome<T>> {
  const guarded = await withRunGuard({ admin, userId, feature }, () =>
    runWithCredits({ admin, userId, feature, units }, run),
  );
  if (guarded.busy) return { charged: false, reason: "busy" };
  return guarded.value;
}
