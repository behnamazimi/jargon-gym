import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateInternalApiRequest } from "./internal-api";

beforeEach(() => {
  vi.stubEnv("TELEGRAM_INTERNAL_SECRET", "old-secret");
  vi.stubEnv("AI_INTERNAL_SECRET", "new-secret");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("authenticateInternalApiRequest (Telegram routes)", () => {
  function call(token: string) {
    return authenticateInternalApiRequest(
      new Request("http://localhost/x", { headers: { authorization: `Bearer ${token}` } }),
    );
  }

  it("accepts the Telegram secret", () => {
    expect(call("old-secret")).toEqual({ ok: true });
  });

  it("never accepts the AI secret", () => {
    const result = call("new-secret");
    expect("error" in result ? result.error?.status : undefined).toBe(401);
  });
});
