import { APICallError, RetryError } from "ai";
import { describe, expect, it } from "vitest";
import { isKeyRejected, isModelUnavailable, isProviderKeyFault, providerStatus } from "./errors";

function apiError(statusCode: number, message = "fail") {
  return new APICallError({
    message,
    url: "https://x.test",
    requestBodyValues: {},
    statusCode,
  });
}

describe("providerStatus", () => {
  it("reads the status of a provider error", () => {
    expect(providerStatus(apiError(503))).toBe(503);
  });

  it("looks through the SDK's retry wrapper", () => {
    const error = new RetryError({
      message: "gave up",
      reason: "maxRetriesExceeded",
      errors: [apiError(500), apiError(429)],
    });
    expect(providerStatus(error)).toBe(429);
  });

  it("is undefined for anything else", () => {
    expect(providerStatus(new Error("boom"))).toBeUndefined();
  });
});

describe("isProviderKeyFault", () => {
  it.each([401, 402, 403, 404, 429])(
    "treats %i as a key, quota or model access problem",
    (status) => {
      expect(isProviderKeyFault(apiError(status))).toBe(true);
    },
  );

  it.each([400, 500, 503])("does not treat %i as one", (status) => {
    expect(isProviderKeyFault(apiError(status))).toBe(false);
  });
});

describe("isModelUnavailable", () => {
  it("catches the 404 for a model the key can't use", () => {
    expect(
      isModelUnavailable(apiError(404, "This model is no longer available to new users")),
    ).toBe(true);
  });

  it("is false for other failures", () => {
    expect(isModelUnavailable(apiError(400))).toBe(false);
    expect(isModelUnavailable(new Error("boom"))).toBe(false);
  });
});

describe("isKeyRejected", () => {
  it("catches Anthropic-style 401 and 403", () => {
    expect(isKeyRejected(apiError(401))).toBe(true);
    expect(isKeyRejected(apiError(403))).toBe(true);
  });

  it("catches Google's 400 for a bad key", () => {
    const error = apiError(400, "API key not valid. Please pass a valid API key.");
    expect(isKeyRejected(error)).toBe(true);
    expect(isProviderKeyFault(error)).toBe(true);
  });

  it("does not mistake other 400s or quota errors for a rejected key", () => {
    expect(isKeyRejected(apiError(400, "Invalid request body"))).toBe(false);
    expect(isKeyRejected(apiError(429))).toBe(false);
  });
});
