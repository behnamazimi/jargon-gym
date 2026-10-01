import { describe, expect, it } from "vitest";
import {
  buildAdminNoticeEmail,
  buildDeclinedEmail,
  buildDelayEmail,
  buildNeedsInputEmail,
  buildReadyEmail,
  escapeHtml,
} from "./email-copy";

const HOSTILE = `<script>alert("x")</script> & 'quotes'`;

describe("escapeHtml", () => {
  it("escapes the five characters", () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;",
    );
  });
});

describe("request emails escape what people wrote", () => {
  const emails: [string, { subject: string; html: string; text: string }][] = [
    [
      "ready",
      buildReadyEmail({
        topic: HOSTILE,
        terms: 3,
        deliveryKind: "added_shared",
        collectionName: HOSTILE,
        url: "https://x.test/a?b=1&c=2",
      }),
    ],
    [
      "needs input",
      buildNeedsInputEmail({ topic: HOSTILE, question: HOSTILE, url: "https://x.test" }),
    ],
    ["delay", buildDelayEmail({ topic: HOSTILE, date: "Sat 4 Oct", url: "https://x.test" })],
    [
      "declined",
      buildDeclinedEmail({
        topic: HOSTILE,
        reason: "too_broad",
        note: HOSTILE,
        pasteUrl: "https://x.test",
      }),
    ],
    [
      "admin notice",
      buildAdminNoticeEmail({
        topic: HOSTILE,
        kindLabel: "Jargon",
        languageLabel: "English",
        adminUrl: "https://x.test",
      }),
    ],
  ];

  it.each(emails)("%s", (_name, email) => {
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.text).toContain("<script>");
  });

  it("escapes the link", () => {
    const email = buildReadyEmail({
      topic: "x",
      terms: 1,
      deliveryKind: "prepared",
      collectionName: null,
      url: "https://x.test/a?b=1&c=2",
    });
    expect(email.html).toContain("https://x.test/a?b=1&amp;c=2");
  });
});

describe("request email subjects", () => {
  it("names the topic", () => {
    expect(
      buildReadyEmail({
        topic: "Helm",
        terms: 2,
        deliveryKind: "prepared",
        collectionName: null,
        url: "u",
      }).subject,
    ).toBe('"Helm" is ready in your Library');
    expect(buildNeedsInputEmail({ topic: "Helm", question: "q", url: "u" }).subject).toBe(
      'A quick question about "Helm"',
    );
    expect(buildDelayEmail({ topic: "Helm", date: "d", url: "u" }).subject).toBe(
      '"Helm" is taking a little longer',
    );
    expect(
      buildDeclinedEmail({ topic: "Helm", reason: "too_niche", note: null, pasteUrl: "u" }).subject,
    ).toBe('We couldn\'t prepare "Helm"');
  });

  it("says one term, not 1 terms", () => {
    const email = buildReadyEmail({
      topic: "x",
      terms: 1,
      deliveryKind: "prepared",
      collectionName: null,
      url: "u",
    });
    expect(email.text).toContain("1 term is in your Library");
  });
});
