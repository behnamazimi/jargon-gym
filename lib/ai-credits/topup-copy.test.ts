import { describe, expect, it } from "vitest";
import { buildTopUpAdminEmail, buildTopUpUserEmail, TOPUP_COPY } from "./topup-copy";

const userEmail = buildTopUpUserEmail({
  added: 30,
  remaining: 42,
  settingsUrl: "https://x.test/app/settings?tab=ai",
});

describe("top-up copy", () => {
  it("never names the admin or promises anything unlimited or instant to the user", () => {
    const strings = [
      ...Object.values({ ...TOPUP_COPY, added: TOPUP_COPY.added(30) }),
      userEmail.subject,
      userEmail.text,
      userEmail.html,
    ].map(String);
    for (const text of strings) {
      expect(text).not.toMatch(/\badmin\b|unlimited|instant|automatic/i);
    }
  });

  it("tells the user what was added and the new balance", () => {
    expect(userEmail.text).toContain("30 credits");
    expect(userEmail.text).toContain("42 credits");
  });

  it("escapes anything that came from a person", () => {
    const email = buildTopUpAdminEmail({
      email: '<script>alert("x")</script>@x.test',
      added: 1,
      remaining: 1,
      adminUrl: "https://x.test/admin/people/u1",
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.text).toContain("1 credit ");
  });
});
