import { narrationCost } from "@/lib/ai-credits/costs";
import type { TopUpState } from "@/lib/ai-credits/types";
import type { AiAccessView } from "@/lib/llm/types";
import { buildStoryScript } from "./script";

export type NarrationPrice = { cost: number; remaining: number; topUp: TopUpState };

/** What listening to this story for the first time would cost, and what the
 *  person has left. Null when AI credits aren't in play. */
export function narrationPrice(
  ai: AiAccessView,
  story: { title: string; segments: readonly { text: string }[] },
): NarrationPrice | null {
  if (ai.kind !== "credits") return null;
  return {
    cost: narrationCost(buildStoryScript(story).length, ai.costs),
    remaining: ai.remaining,
    topUp: ai.topUp,
  };
}
