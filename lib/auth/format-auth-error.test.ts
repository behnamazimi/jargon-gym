import { describe, expect, it } from "vitest";
import {
  FULL_REFERRAL,
  formatAuthError,
  RATE_LIMITED_ERROR,
  SUSPENDED_ERROR,
} from "./format-auth-error";

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

  it("replaces Supabase's rate-limit wording in every flow that sends email", () => {
    const error = {
      code: "over_email_send_rate_limit",
      message: "For security purposes, you can only request this after 0 seconds.",
    };
    for (const context of ["signup", "forgot", "login"] as const) {
      expect(formatAuthError(error, context)).toBe(RATE_LIMITED_ERROR);
    }
    expect(formatAuthError({ code: "over_request_rate_limit" }, "signup")).toBe(RATE_LIMITED_ERROR);
  });
});
