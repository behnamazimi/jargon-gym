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
  it("accepts the AI secret and labels it", () => {
    expect(authenticateNarrationSyncRequest(request("new-secret"))).toMatchObject({
      ok: true,
      secret: "ai",
      source: "cron",
    });
  });

  it("still accepts the old Telegram secret, labelled legacy", () => {
    expect(authenticateNarrationSyncRequest(request("old-secret"))).toMatchObject({
      ok: true,
      secret: "legacy",
    });
  });

  it("counts equal secrets as the old one, since the two can't be told apart", () => {
    vi.stubEnv("TELEGRAM_INTERNAL_SECRET", "new-secret");
    expect(authenticateNarrationSyncRequest(request("new-secret"))).toMatchObject({
      ok: true,
      secret: "legacy",
    });
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

  it("works with only the new secret set, the end state", () => {
    vi.stubEnv("TELEGRAM_INTERNAL_SECRET", "");
    expect(authenticateNarrationSyncRequest(request("new-secret"))).toMatchObject({ ok: true });
    const old = authenticateNarrationSyncRequest(request("old-secret"));
    expect(old.error?.status).toBe(401);
  });

  it("works with only the old secret set, the starting point", () => {
    vi.stubEnv("AI_INTERNAL_SECRET", "");
    expect(authenticateNarrationSyncRequest(request("old-secret"))).toMatchObject({
      ok: true,
      secret: "legacy",
    });
  });

  it("is a server error, not a rejection, when neither secret is set", () => {
    vi.stubEnv("AI_INTERNAL_SECRET", "");
    vi.stubEnv("TELEGRAM_INTERNAL_SECRET", "");
    const result = authenticateNarrationSyncRequest(request("anything"));
    expect(result.error?.status).toBe(500);
  });
});

describe("getNarrationSyncSecret", () => {
  it("prefers the AI secret, else the old one, else throws", () => {
    expect(getNarrationSyncSecret()).toBe("new-secret");
    vi.stubEnv("AI_INTERNAL_SECRET", "");
    expect(getNarrationSyncSecret()).toBe("old-secret");
    vi.stubEnv("TELEGRAM_INTERNAL_SECRET", "");
    expect(() => getNarrationSyncSecret()).toThrow();
  });
});
