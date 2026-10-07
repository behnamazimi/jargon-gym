import { beforeEach, describe, expect, it, vi } from "vitest";
import { AI_TEMPORARILY_UNAVAILABLE } from "@/lib/ai-credits/messages";
import { storyFailure } from "./failure";
import { StoryProviderError } from "./generate";

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => undefined));

describe("storyFailure", () => {
  it("hides key and quota problems behind a generic message", () => {
    for (const kind of ["auth", "rate-limit"] as const) {
      const err = new StoryProviderError("secret provider detail", kind);
      expect(storyFailure(err)).toEqual({
        error: AI_TEMPORARILY_UNAVAILABLE,
        reason: "unavailable",
      });
    }
  });

  it("keeps the plain retry message for other provider failures", () => {
    const err = new StoryProviderError("Couldn't write a story this time. Try again.", "other");
    expect(storyFailure(err)).toEqual({ error: err.message, reason: "unavailable" });
  });

  it("tells the user a timeout took too long", () => {
    const err = new StoryProviderError("Writing the story took too long. Try again.", "timeout");
    expect(storyFailure(err)).toEqual({ error: err.message, reason: "unavailable" });
  });

  it("never leaks an unexpected error's text", () => {
    const result = storyFailure(new Error("PGRST: relation stories missing"));
    expect(result.error).toBe("Couldn't write a story this time. Try again.");
    expect(result.reason).toBe("unavailable");
  });
});
