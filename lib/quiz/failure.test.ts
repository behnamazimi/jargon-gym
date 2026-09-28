import { APICallError } from "ai";
import { describe, expect, it } from "vitest";
import { AI_TEMPORARILY_UNAVAILABLE } from "@/lib/ai-credits/messages";
import { quizFailure } from "./failure";

function apiError(statusCode: number, message = "fail") {
  return new APICallError({ message, url: "https://x.test", requestBodyValues: {}, statusCode });
}

describe("quizFailure with the user's own key", () => {
  it("offers the switch only when the key was rejected", () => {
    expect(quizFailure(apiError(401, "bad key"), false)).toEqual({
      error: "bad key",
      reason: "own-key",
    });
    expect(quizFailure(apiError(400, "API key not valid."), false).reason).toBe("own-key");
  });

  it("never puts a working key at risk over a passing quota or server error", () => {
    for (const status of [402, 429, 500, 503]) {
      expect(quizFailure(apiError(status), false).reason).toBeUndefined();
    }
  });

  it("keeps the provider's own message, as before", () => {
    expect(quizFailure(new Error("Quota exceeded"), false).error).toBe("Quota exceeded");
    expect(quizFailure("weird", false).error).toMatch(/Check your API key/);
  });
});

describe("quizFailure on AI credits", () => {
  it("hides key and quota problems behind a generic message", () => {
    for (const status of [401, 402, 403, 429]) {
      expect(quizFailure(apiError(status, "secret detail"), true)).toEqual({
        error: AI_TEMPORARILY_UNAVAILABLE,
        reason: "unavailable",
      });
    }
  });

  it("uses a plain retry message otherwise, never the raw error", () => {
    const result = quizFailure(new Error("PGRST116 relation missing"), true);
    expect(result).toEqual({
      error: "Couldn't generate the quiz. Try again.",
      reason: "unavailable",
    });
  });
});
