import { z } from "zod";

export const REPORT_REASONS = ["rules", "personal_info", "not_appropriate"] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_NOTE_MAX = 500;
export const TAKEDOWN_NOTE_MAX = 200;

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  rules: "Breaks the rules",
  personal_info: "Has personal information",
  not_appropriate: "Not appropriate to share",
};

const OWNER_NOTICE: Record<ReportReason, string> = {
  rules: "Sharing was turned off for this collection because it breaks the rules.",
  personal_info: "Sharing was turned off for this collection because it has personal information.",
  not_appropriate:
    "Sharing was turned off for this collection because it isn't appropriate to share.",
};

export function ownerNoticeFor(reason: string | null | undefined): string {
  return isReportReason(reason)
    ? OWNER_NOTICE[reason]
    : "Sharing was turned off for this collection.";
}

export function isReportReason(value: unknown): value is ReportReason {
  return REPORT_REASONS.includes(value as ReportReason);
}

export const reportInputSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  note: z
    .string()
    .trim()
    .max(REPORT_NOTE_MAX)
    .optional()
    .transform((note) => note || undefined),
});

export const REPORT_ERROR_COPY: Record<string, string> = {
  collection_not_shared: "This collection isn't shared any more.",
  builtin_collection: "Built-in collections can't be reported.",
  own_collection: "You can't report your own collection.",
  invalid_report: "Choose a reason and keep the note under 500 characters.",
  report_quota_reached: "You've sent a lot of reports today. Try again tomorrow.",
};

export const LOVE_ERROR_COPY: Record<string, string> = {
  collection_not_shared: "This collection isn't shared any more.",
  own_collection: "You can't love your own collection.",
};

export const REPORT_FALLBACK_ERROR = "Couldn't send that report. Try again.";
export const LOVE_FALLBACK_ERROR = "Couldn't save that. Try again.";
export const REPORTED_THANKS = "Reported, thanks";
