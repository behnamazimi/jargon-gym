import { describe, expect, it } from "vitest";
import { BODY_MAX, isWebp, issueReportSchema } from "./schema";

describe("issueReportSchema", () => {
  it("accepts a problem with context", () => {
    const parsed = issueReportSchema.parse({
      kind: "problem",
      body: "  The quiz froze after the third question.  ",
      pagePath: "/app/quiz",
      viewport: "390x844",
    });
    expect(parsed.body).toBe("The quiz froze after the third question.");
  });

  it("rejects short or long text and unknown kinds", () => {
    expect(issueReportSchema.safeParse({ kind: "idea", body: "too short" }).success).toBe(false);
    expect(
      issueReportSchema.safeParse({ kind: "idea", body: "x".repeat(BODY_MAX + 1) }).success,
    ).toBe(false);
    expect(issueReportSchema.safeParse({ kind: "bug", body: "long enough text" }).success).toBe(
      false,
    );
  });
});

describe("isWebp", () => {
  const encode = (text: string) => new TextEncoder().encode(text);

  it("spots the WebP header", () => {
    expect(isWebp(encode("RIFF\0\0\0\0WEBPVP8 "))).toBe(true);
  });

  it("rejects other files", () => {
    expect(isWebp(encode("\x89PNG\r\n\x1a\n\0\0\0\0"))).toBe(false);
    expect(isWebp(encode("RIFF"))).toBe(false);
  });
});
