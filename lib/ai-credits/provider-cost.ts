/** What providers charge, in micro-dollars (millionths of a dollar), so a cost
 *  can be stored next to the credits it was priced at. These are estimates from
 *  published rates; check them against invoices. */

type TokenRates = { inputPerMillion: number; outputPerMillion: number };

/** Gemini 3.8 Flash. Thinking tokens are billed as output. The introductory
 *  rate ends on December 31, 2026. */
function geminiRates(at: Date): TokenRates {
  return at < new Date("2027-01-01T00:00:00Z")
    ? { inputPerMillion: 0.75, outputPerMillion: 3.75 }
    : { inputPerMillion: 1.5, outputPerMillion: 7.5 };
}

const HAIKU_RATES: TokenRates = { inputPerMillion: 1, outputPerMillion: 5 };

export type TokenUsage = {
  inputTokens: number;
  /** Everything the model wrote, hidden reasoning included. */
  outputTokens: number;
  /** The reasoning part of `outputTokens`, kept to see how much it is. */
  reasoningTokens: number;
};

/** A dollar per million tokens is exactly one micro-dollar per token. */
export function tokenCostMicroUsd(
  provider: "google" | "anthropic",
  usage: TokenUsage,
  at: Date = new Date(),
): number {
  const rates = provider === "google" ? geminiRates(at) : HAIKU_RATES;
  return usage.inputTokens * rates.inputPerMillion + usage.outputTokens * rates.outputPerMillion;
}
