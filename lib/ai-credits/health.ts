import type { AiCreditSummary } from "./admin";

/** Many of the last day's requests failed and were refunded. That usually means
 *  the app's AI key was revoked or ran out of quota. */
export function refundsLookHigh(
  summary: Pick<AiCreditSummary, "spends24h" | "refunds24h">,
): boolean {
  return summary.refunds24h >= 3 && summary.refunds24h * 2 >= summary.spends24h;
}
