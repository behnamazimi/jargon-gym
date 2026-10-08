import type { LanguageModelUsage } from "ai";
import type { TokenUsage } from "./provider-cost";

export type UsageTally = {
  /** Adds one model call's usage. Missing numbers count as zero. */
  add: (usage: LanguageModelUsage | undefined) => void;
  read: () => TokenUsage & { calls: number };
};

/** Adds up the tokens of every model call behind one charged action, retries
 *  included, so the recorded cost is what the provider really billed. */
export function createUsageTally(): UsageTally {
  const total = { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, calls: 0 };
  return {
    add: (usage) => {
      if (!usage) return;
      total.inputTokens += usage.inputTokens ?? 0;
      total.outputTokens += usage.outputTokens ?? 0;
      total.reasoningTokens += usage.outputTokenDetails?.reasoningTokens ?? 0;
      total.calls += 1;
    },
    read: () => ({ ...total }),
  };
}
