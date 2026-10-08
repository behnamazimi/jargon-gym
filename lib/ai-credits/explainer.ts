import { pluralize } from "@/lib/utils";
import type { CreditSchedule } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
});

function formatUtcDate(date: Date): string {
  return `${dateFormat.format(date)} (UTC)`;
}

/** Credits that lapse at a UTC midnight are gone from that moment, so the last
 *  day they can be used is the one before. */
function isUtcMidnight(date: Date): boolean {
  return date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
}

/** "20 credits refill" but "1 credit refills". */
function creditsThat(amount: number, verb: string): string {
  return `${pluralize(amount, "credit")} ${amount === 1 ? `${verb}s` : verb}`;
}

/** When credits next lapse and refill; empty when neither applies. */
export function refillLines(schedule: CreditSchedule | null): string[] {
  const lines: string[] = [];

  if (schedule?.expiry) {
    const at = new Date(schedule.expiry.at);
    const credits = creditsThat(schedule.expiry.amount, "expire");
    lines.push(
      isUtcMidnight(at)
        ? `${credits} at the end of ${formatUtcDate(new Date(at.getTime() - DAY_MS))}.`
        : `${credits} on ${formatUtcDate(at)}.`,
    );
  }

  if (schedule?.nextRefill) {
    const credits = creditsThat(schedule.nextRefill.amount, "refill");
    lines.push(`${credits} on ${formatUtcDate(new Date(schedule.nextRefill.at))}.`);
  }

  return lines;
}
