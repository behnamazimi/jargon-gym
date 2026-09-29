import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateNarrationSyncRequest, getNarrationSyncSecret } from "./sync-auth";

function request(token?: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/internal/narration/sync", {
    method: "POST",
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
  });
}

beforeEach(() => {
  vi.stubEnv("AI_INTERNAL_SECRET", "new-secret");
  vi.stubEnv("TELEGRAM_INTERNAL_SECRET", "old-secret");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("authenticateNarrationSyncRequest", () => {
  it("accepts the AI secret and treats a plain call as the cron job", () => {
    expect(authenticateNarrationSyncRequest(request("new-secret"))).toMatchObject({
      ok: true,
      source: "cron",
    });
  });

  it("no longer accepts the old Telegram secret", () => {
    expect(authenticateNarrationSyncRequest(request("old-secret")).error?.status).toBe(401);
  });

  it("treats a call marked as the app's own kick as the app", () => {
    expect(
      authenticateNarrationSyncRequest(request("new-secret", { "x-internal-source": "app" })),
    ).toMatchObject({ source: "app" });
  });

  it("rejects wrong, empty, missing and differently sized tokens without throwing", () => {
    for (const token of ["nope", "new-secret-and-more", "n", "", undefined]) {
      const result = authenticateNarrationSyncRequest(request(token));
      expect(result.error?.status).toBe(401);
    }
  });

  it("is a server error, not a rejection, when the secret is not set", () => {
    vi.stubEnv("AI_INTERNAL_SECRET", "");
    const result = authenticateNarrationSyncRequest(request("anything"));
    expect(result.error?.status).toBe(500);
  });
});

describe("getNarrationSyncSecret", () => {
  it("returns the AI secret and throws when it is not set", () => {
    expect(getNarrationSyncSecret()).toBe("new-secret");
    vi.stubEnv("AI_INTERNAL_SECRET", "");
    expect(() => getNarrationSyncSecret()).toThrow();
  });
});
