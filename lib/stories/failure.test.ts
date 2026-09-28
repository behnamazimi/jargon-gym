import { beforeEach, describe, expect, it, vi } from "vitest";
import { AI_TEMPORARILY_UNAVAILABLE } from "@/lib/ai-credits/messages";
import { storyFailure } from "./failure";
import { StoryProviderError } from "./generate";

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => undefined));

describe("storyFailure with the user's own key", () => {
  it("passes the provider message through and marks a rejected key", () => {
    const err = new StoryProviderError("Your API key was rejected. Update it in Settings.", "auth");
    expect(storyFailure(err, false)).toEqual({ error: err.message, reason: "own-key" });
  });

  it("does not blame the key for a rate limit or other failure", () => {
    const limited = new StoryProviderError(
      "Your provider is rate-limiting requests.",
      "rate-limit",
    );
    expect(storyFailure(limited, false)).toEqual({ error: limited.message, reason: undefined });
  });
});

describe("storyFailure on AI credits", () => {
  it("hides key and quota problems behind a generic message", () => {
    for (const kind of ["auth", "rate-limit"] as const) {
      const err = new StoryProviderError("secret provider detail", kind);
      expect(storyFailure(err, true)).toEqual({
        error: AI_TEMPORARILY_UNAVAILABLE,
        reason: "unavailable",
      });
    }
  });

  it("keeps the plain retry message for other provider failures", () => {
    const err = new StoryProviderError("Couldn't write a story this time. Try again.", "other");
    expect(storyFailure(err, true)).toEqual({ error: err.message, reason: "unavailable" });
  });

  it("never leaks an unexpected error's text", () => {
    const result = storyFailure(new Error("PGRST: relation stories missing"), true);
    expect(result.error).toBe("Couldn't write a story this time. Try again.");
    expect(result.reason).toBe("unavailable");
  });
});
