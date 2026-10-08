import { APICallError } from "ai";
import { describe, expect, it } from "vitest";
import { AI_TEMPORARILY_UNAVAILABLE } from "@/lib/ai-credits/messages";
import { QuizTimeoutError, quizFailure } from "./failure";

function apiError(statusCode: number, message = "fail") {
  return new APICallError({ message, url: "https://x.test", requestBodyValues: {}, statusCode });
}

describe("quizFailure", () => {
  it("hides key and quota problems behind a generic message", () => {
    for (const status of [401, 402, 403, 429]) {
      expect(quizFailure(apiError(status, "secret detail"))).toEqual({
        error: AI_TEMPORARILY_UNAVAILABLE,
        reason: "unavailable",
      });
    }
  });

  it("tells the user the quiz took too long, and that they can try again", () => {
    expect(quizFailure(new QuizTimeoutError())).toEqual({
      error: "Writing the quiz took too long. Try again.",
      reason: "unavailable",
    });
  });

  it("uses a plain retry message otherwise, never the raw error", () => {
    expect(quizFailure(new Error("PGRST116 relation missing"))).toEqual({
      error: "Couldn't generate the quiz. Try again.",
      reason: "unavailable",
    });
    expect(quizFailure("weird").error).toBe("Couldn't generate the quiz. Try again.");
  });
});
