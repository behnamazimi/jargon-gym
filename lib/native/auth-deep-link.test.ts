import { describe, expect, it } from "vitest";
import { NATIVE_AUTH_REDIRECT, parseAuthDeepLink } from "./auth-deep-link";

describe("parseAuthDeepLink", () => {
  it("maps the sign-in link to the web callback with the code and a safe next", () => {
    const path = parseAuthDeepLink(
      `${NATIVE_AUTH_REDIRECT}?code=abc&next=%2Fapp%2Freview&ref=xy12`,
    );
    expect(path).toBe("/auth/callback?code=abc&next=%2Fapp%2Freview&ref=XY12");
  });

  it("replaces a next that leaves the site", () => {
    const path = parseAuthDeepLink(`${NATIVE_AUTH_REDIRECT}?code=abc&next=https%3A%2F%2Fevil.test`);
    expect(path).toBe("/auth/callback?code=abc&next=%2Fapp%2Freview");
  });

  it("drops parameters it doesn't know", () => {
    const path = parseAuthDeepLink(
      `${NATIVE_AUTH_REDIRECT}?code=abc&redirect=https%3A%2F%2Fevil.test`,
    );
    expect(path).not.toContain("evil");
  });

  it.each([
    "https://lobyas.com/auth/callback?code=abc",
    "com.lobyas.app://other/callback?code=abc",
    "com.lobyas.app://auth/elsewhere?code=abc",
    "com.other.app://auth/callback?code=abc",
    "not a url",
  ])("ignores %s", (link) => {
    expect(parseAuthDeepLink(link)).toBeNull();
  });
});
