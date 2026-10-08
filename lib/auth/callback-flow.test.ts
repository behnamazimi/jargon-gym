import { describe, expect, it } from "vitest";
import { callbackFailureError, callbackSignInMethod } from "./callback-flow";

describe("callback flow", () => {
  it("blames the link, not Google, when the email link fails", () => {
    expect(callbackFailureError("email")).toBe("link-failed");
    expect(callbackSignInMethod("email")).toBe("email");
  });

  it("says the reset link failed when a password-reset link fails", () => {
    expect(callbackFailureError("reset")).toBe("reset-failed");
    expect(callbackSignInMethod("reset")).toBe("email");
  });

  it("keeps the Google wording for everything else", () => {
    for (const flow of [null, "", "google", "other"]) {
      expect(callbackFailureError(flow)).toBe("oauth-failed");
      expect(callbackSignInMethod(flow)).toBe("google");
    }
  });
});
