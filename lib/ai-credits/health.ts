import type { AiCreditSummary } from "./admin";

/** Many of the last day's requests failed and were refunded, for more than one
 *  person. That usually means the app's AI key was revoked or ran out of quota,
 *  not that one person had a bad connection. */
export function refundsLookHigh(
  summary: Pick<AiCreditSummary, "spends24h" | "refunds24h" | "refundUsers24h">,
): boolean {
  return (
    summary.refunds24h >= 3 &&
    summary.refunds24h * 2 >= summary.spends24h &&
    summary.refundUsers24h >= 2
  );
}
