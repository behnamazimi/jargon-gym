import { describe, expect, it } from "vitest";
import { formatAuthError, SUSPENDED_ERROR } from "./format-auth-error";

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
});
