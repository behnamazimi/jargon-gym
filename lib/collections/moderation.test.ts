import { describe, expect, it } from "vitest";
import {
  LOVE_ERROR_COPY,
  ownerNoticeFor,
  REPORT_ERROR_COPY,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  reportInputSchema,
  REPORTED_THANKS,
} from "./moderation";

const strings = [
  ...Object.values(REPORT_REASON_LABELS),
  ...REPORT_REASONS.map((reason) => ownerNoticeFor(reason)),
  ownerNoticeFor(null),
  ...Object.values(REPORT_ERROR_COPY),
  ...Object.values(LOVE_ERROR_COPY),
  REPORTED_THANKS,
];

describe("moderation copy", () => {
  it("never says jargon", () => {
    for (const text of strings) expect(text).not.toMatch(/jargon/i);
  });

  it("never names the admin", () => {
    for (const text of strings) expect(text).not.toMatch(/\badmin/i);
  });

  it("tells the owner sharing was turned off, naming only the reason", () => {
    for (const reason of REPORT_REASONS) {
      expect(ownerNoticeFor(reason)).toMatch(/^Sharing was turned off/);
    }
  });
});

describe("reportInputSchema", () => {
  it("requires a known reason", () => {
    expect(reportInputSchema.safeParse({ reason: "spam" }).success).toBe(false);
    expect(reportInputSchema.safeParse({ reason: "rules" }).success).toBe(true);
  });

  it("trims the note and drops an empty one", () => {
    expect(reportInputSchema.parse({ reason: "rules", note: "  hi  " }).note).toBe("hi");
    expect(reportInputSchema.parse({ reason: "rules", note: "   " }).note).toBeUndefined();
  });

  it("caps the note at 500 characters", () => {
    expect(reportInputSchema.safeParse({ reason: "rules", note: "x".repeat(501) }).success).toBe(
      false,
    );
  });
});
