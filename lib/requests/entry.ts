import { REQUEST_COPY } from "./copy";
import { formatRequestDate } from "./dates";
import type { RequestQuota } from "./types";

/** What the Request row, the form and the Browse hint do for this person right now. */
export type RequestEntry =
  | { state: "closed" }
  | { state: "open"; topic: string }
  | { state: "cap"; date: string }
  | { state: "available"; used: number; estimateDays: number; paused: boolean };

export function entryFor(quota: RequestQuota, timeZone: string | null): RequestEntry {
  if (quota.openRequestId) {
    return { state: "open", topic: quota.openRequestTopic ?? "your request" };
  }
  if (!quota.enabled) return { state: "closed" };
  if (quota.used >= quota.limit && quota.nextAvailableAt) {
    return { state: "cap", date: formatRequestDate(quota.nextAvailableAt, timeZone) };
  }
  return {
    state: "available",
    used: quota.used,
    estimateDays: quota.estimateDays,
    paused: quota.paused,
  };
}

/** The sentence for an entry that can't send a request, or null when one can be sent. */
export function blockedMessage(entry: RequestEntry): string | null {
  switch (entry.state) {
    case "closed":
      return REQUEST_COPY.form.closed;
    case "open":
      return REQUEST_COPY.form.openRequest(entry.topic);
    case "cap":
      return REQUEST_COPY.form.capReached(entry.date);
    case "available":
      return null;
  }
}
