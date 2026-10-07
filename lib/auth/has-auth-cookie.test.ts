import { describe, expect, it } from "vitest";
import { hasAuthCookie } from "./has-auth-cookie";

const header = (...cookies: Array<[name: string, value: string]>) =>
  cookies.map(([name, value]) => [name, value].join("=")).join("; ");

describe("hasAuthCookie", () => {
  it("sees the session cookie, whole or chunked", () => {
    expect(hasAuthCookie(header(["theme", "dark"], ["sb-abc-auth-token", "x"]))).toBe(true);
    expect(hasAuthCookie(header(["sb-abc-auth-token.0", "a"], ["sb-abc-auth-token.1", "b"]))).toBe(
      true,
    );
  });

  it("ignores other cookies, including the OAuth code verifier", () => {
    expect(hasAuthCookie("")).toBe(false);
    expect(hasAuthCookie(header(["theme", "dark"]))).toBe(false);
    expect(hasAuthCookie(header(["sb-abc-auth-token-code-verifier", "x"]))).toBe(false);
  });
});
