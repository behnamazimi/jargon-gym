import { APICallError, RetryError } from "ai";
import { describe, expect, it } from "vitest";
import { describeFailure } from "./failure-reason";

function apiError(statusCode: number | undefined, message: string) {
  return new APICallError({ message, url: "https://x.test", requestBodyValues: {}, statusCode });
}

describe("describeFailure", () => {
  it("names the provider status and message", () => {
    expect(describeFailure(apiError(429, "Quota exceeded"))).toBe(
      "Provider error 429: Quota exceeded",
    );
    expect(describeFailure(apiError(undefined, "fetch failed"))).toBe(
      "Provider error no status: fetch failed",
    );
  });

  it("looks through the SDK's retry wrapper to the last failure", () => {
    const error = new RetryError({
      message: "gave up",
      reason: "maxRetriesExceeded",
      errors: [apiError(500, "first"), apiError(503, "Service unavailable")],
    });
    expect(describeFailure(error)).toBe("Provider error 503: Service unavailable");
  });

  it("names other errors by type, so unusable model replies are recognizable", () => {
    class StoryGenerationError extends Error {
      name = "StoryGenerationError";
    }
    expect(describeFailure(new StoryGenerationError("Story used too few terms"))).toBe(
      "StoryGenerationError: Story used too few terms",
    );
  });

  it("never stores a key, even one that ended up in a message", () => {
    const withQuery = describeFailure(
      apiError(
        400,
        "Bad request to https://api.example.com/v1?key=AIzaSyA1234567890abcdefghijk&x=1",
      ),
    );
    expect(withQuery).not.toContain("AIza");
    expect(withQuery).toContain("key=[removed]");

    const bare = describeFailure(new Error("rejected sk-abcdefghijklmnop123456 for this call"));
    expect(bare).not.toContain("sk-abcdefghijklmnop123456");
  });

  it("keeps it to one short line", () => {
    const long = describeFailure(new Error(`line one\n\n${"x".repeat(1000)}`));
    expect(long).not.toContain("\n");
    expect(long.length).toBeLessThanOrEqual(200);
  });

  it("copes with things that aren't errors", () => {
    expect(describeFailure("boom")).toBe("Unknown error");
    expect(describeFailure(undefined)).toBe("Unknown error");
  });
});
