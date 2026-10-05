import { z } from "zod";

export const ISSUE_KINDS = ["problem", "idea"] as const;
export type IssueKind = (typeof ISSUE_KINDS)[number];

export const ISSUE_STATUSES = ["new", "done", "wont_do"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const BODY_MIN = 10;
export const BODY_MAX = 2000;
export const MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024;
export const DAILY_LIMIT = 10;

export const issueReportSchema = z.object({
  kind: z.enum(ISSUE_KINDS),
  body: z.string().trim().min(BODY_MIN).max(BODY_MAX),
  pagePath: z.string().max(500).optional(),
  userAgent: z.string().max(500).optional(),
  viewport: z.string().max(20).optional(),
});

/** WebP files start with "RIFF", four size bytes, then "WEBP". */
export function isWebp(bytes: Uint8Array): boolean {
  const tag = (from: number) => String.fromCharCode(...bytes.subarray(from, from + 4));
  return bytes.length >= 12 && tag(0) === "RIFF" && tag(8) === "WEBP";
}
