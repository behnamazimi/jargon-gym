import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { refundCredits, reserveCredits } from "./repository";
import type { CreditFeature } from "./types";

type ChargeInput = {
  admin: SupabaseClient<Database>;
  userId: string;
  feature: CreditFeature;
  cost: number;
};

export type ChargeOutcome<T> =
  | { charged: true; value: T; remaining: number }
  | { charged: false; reason: "insufficient" | "disabled"; remaining: number; cost: number };

/** Reserves the credits, runs the work, and gives the credits back if the
 *  work throws for any reason. Credits only stay spent for a result the user
 *  actually received. */
export async function runWithCredits<T>(
  { admin, userId, feature, cost }: ChargeInput,
  run: () => Promise<T>,
): Promise<ChargeOutcome<T>> {
  const reservation = await reserveCredits(admin, userId, feature, cost);
  if (reservation.status !== "ok") {
    return { charged: false, reason: reservation.status, remaining: reservation.remaining, cost };
  }

  try {
    const value = await run();
    return { charged: true, value, remaining: reservation.remaining };
  } catch (error) {
    try {
      await refundCredits(admin, reservation.ledgerId);
    } catch (refundError) {
      console.error("Couldn't refund AI credits:", refundError);
    }
    throw error;
  }
}
