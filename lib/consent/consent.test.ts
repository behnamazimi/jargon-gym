import { describe, expect, it } from "vitest";
import {
  CONSENT_VERSION,
  consentFromCookieHeader,
  currentSavedChoice,
  parseConsent,
  serializeConsentCookie,
  syncConsent,
} from "./consent";

describe("consent cookie", () => {
  it("only accepts the two known values", () => {
    expect(parseConsent("granted")).toBe("granted");
    expect(parseConsent("denied")).toBe("denied");
    for (const value of ["", "yes", "GRANTED", null, undefined]) {
      expect(parseConsent(value)).toBeNull();
    }
  });

  it("finds the choice among other cookies", () => {
    expect(consentFromCookieHeader("theme=dark; lb_consent=granted; a=b")).toBe("granted");
    expect(consentFromCookieHeader("lb_consent=denied")).toBe("denied");
  });

  it("treats a missing or malformed cookie as no choice", () => {
    expect(consentFromCookieHeader(null)).toBeNull();
    expect(consentFromCookieHeader("theme=dark")).toBeNull();
    expect(consentFromCookieHeader("lb_consent=maybe")).toBeNull();
    expect(consentFromCookieHeader("not_lb_consent=granted")).toBeNull();
  });

  it("writes a cookie that lasts and is only Secure over https", () => {
    expect(serializeConsentCookie("granted", true)).toBe(
      "lb_consent=granted; Path=/; Max-Age=15552000; SameSite=Lax; Secure",
    );
    expect(serializeConsentCookie("denied", false)).not.toContain("Secure");
  });
});

describe("syncConsent", () => {
  const table: Array<
    [
      Parameters<typeof syncConsent>[0],
      Parameters<typeof syncConsent>[1],
      ReturnType<typeof syncConsent>,
    ]
  > = [
    [null, null, { effective: null, setCookie: null, saveToAccount: null }],
    ["granted", "granted", { effective: "granted", setCookie: null, saveToAccount: null }],
    ["denied", "denied", { effective: "denied", setCookie: null, saveToAccount: null }],
    [null, "granted", { effective: "granted", setCookie: "granted", saveToAccount: null }],
    [null, "denied", { effective: "denied", setCookie: "denied", saveToAccount: null }],
    ["granted", null, { effective: "granted", setCookie: null, saveToAccount: "granted" }],
    ["denied", null, { effective: "denied", setCookie: null, saveToAccount: "denied" }],
    ["granted", "denied", { effective: "denied", setCookie: "denied", saveToAccount: null }],
    ["denied", "granted", { effective: "denied", setCookie: null, saveToAccount: "denied" }],
  ];

  it.each(table)("device %s, account %s", (cookie, saved, expected) => {
    expect(syncConsent(cookie, saved)).toEqual(expected);
  });
});

describe("currentSavedChoice", () => {
  const now = new Date("2026-10-07T12:00:00Z");
  const saved = (at: string | null, version: string | null = CONSENT_VERSION) => ({
    choice: "granted" as const,
    at,
    version,
  });

  it("uses a recent choice made under the current wording", () => {
    expect(currentSavedChoice(saved("2026-09-01T00:00:00Z"), now)).toBe("granted");
  });

  it("asks again once the choice is older than the cookie lifetime", () => {
    expect(currentSavedChoice(saved("2026-03-01T00:00:00Z"), now)).toBeNull();
  });

  it("ignores a choice made under other wording or with no date", () => {
    expect(currentSavedChoice(saved("2026-09-01T00:00:00Z", "v0"), now)).toBeNull();
    expect(currentSavedChoice(saved(null), now)).toBeNull();
    expect(currentSavedChoice(null, now)).toBeNull();
  });
});
