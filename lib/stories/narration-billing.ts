import type { SupabaseClient } from "@supabase/supabase-js";
import { speechCostMicroUsd } from "@/lib/ai-credits/speech-cost";
import { recordCreditCost, refundCredits, reserveCredits } from "@/lib/ai-credits/repository";
import { describeFailure } from "@/lib/ai-credits/failure-reason";
import type { CreateAudioOptions } from "@/lib/ai/speech/audio";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/** Charges for a story's narration, for `CreateAudioOptions.beforeGenerate`.
 *  The credits are taken when the request that won the clip is about to pay a
 *  provider, and given back if the clip is not made. */
export function chargeStoryNarration(
  admin: Client,
  userId: string,
): NonNullable<CreateAudioOptions["beforeGenerate"]> {
  return async ({ characters }) => {
    const reservation = await reserveCredits(admin, userId, "narration_story", characters);
    if (reservation.status === "insufficient") return { allowed: false, reason: "insufficient" };
    if (reservation.status !== "ok") return { allowed: false, reason: "unavailable" };

    const { ledgerId } = reservation;
    return {
      allowed: true,
      onFailure: () =>
        refundCredits(admin, ledgerId, describeFailure(new Error("Narration failed"))),
      onSuccess: async (calls) => {
        const made = calls.find((call) => call.outcome === "ok");
        const cost = made ? speechCostMicroUsd(made.provider, made.units) : null;
        if (!made || cost === null) return;
        await recordCreditCost(admin, ledgerId, {
          provider: made.provider,
          model: "speech",
          characters: made.units,
          costMicroUsd: cost,
          calls: calls.length,
        });
      },
    };
  };
}
