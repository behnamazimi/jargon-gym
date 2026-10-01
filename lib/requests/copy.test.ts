import { describe, expect, it } from "vitest";
import { REQUEST_COPY } from "./copy";
import {
  buildAdminNoticeEmail,
  buildDeclinedEmail,
  buildDelayEmail,
  buildNeedsInputEmail,
  buildReadyEmail,
} from "./email-copy";
import { DECLINE_REASONS } from "./types";

/** Calls every template with sample arguments and collects the strings. */
function collect(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (typeof value === "function") {
    out.push(String((value as (...args: unknown[]) => unknown)("Sample", "Fri 3 Oct", 2)));
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collect(item, out);
  }
  return out;
}

const NEVER_USE: [string, RegExp][] = [
  ["generating", /generat/i],
  ["AI", /\bAI\b/],
  ["automatic", /automatic/i],
  ["instant", /instant/i],
  ["a percentage", /\d+\s?%/],
  ["progress", /progress/i],
  ["the admin", /\badmin\b/i],
  ["no one sees", /no one sees/i],
  ["100% private", /100%\s*private/i],
  ["expert-written", /expert-written|hand-?crafted/i],
];

const emails = [
  buildReadyEmail({
    topic: "Sample",
    terms: 48,
    deliveryKind: "prepared",
    collectionName: "Sample",
    url: "https://x.test/jargon",
  }),
  buildReadyEmail({
    topic: "Sample",
    terms: 10,
    deliveryKind: "added_shared",
    collectionName: "Kubernetes basics",
    url: "https://x.test/jargon",
  }),
  buildNeedsInputEmail({ topic: "Sample", question: "Which level?", url: "https://x.test/jargon" }),
  buildDelayEmail({ topic: "Sample", date: "Sat 4 Oct", url: "https://x.test/jargon" }),
  ...DECLINE_REASONS.map((reason) =>
    buildDeclinedEmail({
      topic: "Sample",
      reason,
      note: "A short note.",
      pasteUrl: "https://x.test/jargon/import/paste",
    }),
  ),
].flatMap((email) => [email.subject, email.text]);

describe("request copy", () => {
  const strings = [...collect(REQUEST_COPY), ...emails];

  it("has strings to check", () => {
    expect(strings.length).toBeGreaterThan(40);
  });

  it.each(NEVER_USE)("never says %s", (_name, pattern) => {
    expect(strings.filter((s) => pattern.test(s))).toEqual([]);
  });

  it("has a reason for every decline template", () => {
    for (const reason of DECLINE_REASONS) {
      expect(REQUEST_COPY.declineReasons[reason].length).toBeGreaterThan(10);
    }
  });

  it("sets Being prepared only on the in-progress pill", () => {
    const entries = Object.entries(REQUEST_COPY.card.pills).filter(([, label]) =>
      /prepared/i.test(label),
    );
    expect(entries.map(([key]) => key)).toEqual(["in_progress"]);
  });

  it("keeps the admin notice out of the never-use scan on purpose", () => {
    const notice = buildAdminNoticeEmail({
      topic: "Sample",
      kindLabel: "Jargon",
      languageLabel: "English",
      adminUrl: "https://x.test/admin/requests",
    });
    expect(notice.subject).toBe("New collection request");
  });
});
