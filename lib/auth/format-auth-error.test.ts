import { describe, expect, it } from "vitest";
import { FULL_REFERRAL, formatAuthError, SUSPENDED_ERROR } from "./format-auth-error";

describe("formatAuthError", () => {
  it("says a banned account is suspended, whatever Supabase's wording is", () => {
    expect(formatAuthError({ code: "user_banned", message: "User is banned" }, "login")).toBe(
      SUSPENDED_ERROR,
    );
    expect(formatAuthError({ code: "user_banned" }, "login")).toBe(SUSPENDED_ERROR);
  });

  it("still reports a wrong password as before", () => {
    expect(
      formatAuthError(
        { code: "invalid_credentials", message: "Invalid login credentials" },
        "login",
      ),
    ).toBe("That email or password doesn't look right.");
  });

  it("says when a shared reference code is full or expired", () => {
    expect(formatAuthError({ message: "Referral code is full or expired" }, "signup")).toBe(
      FULL_REFERRAL,
    );
  });

  it("keeps the general message for a code that is wrong or already used", () => {
    expect(
      formatAuthError({ message: "Invalid or already used referral code" }, "signup"),
    ).toContain("isn't valid");
  });
});
