import { afterEach, describe, expect, it, vi } from "vitest";
import { FEATURE_IDS } from "./registry";
import { featureHealth } from "./health";

afterEach(() => vi.unstubAllEnvs());

describe("featureHealth", () => {
  it("says the app's key is missing for credits features", () => {
    vi.stubEnv("CENTRAL_LLM_API_KEY", "");
    expect(featureHealth("quiz")).toMatchObject({ ok: false });
    vi.stubEnv("CENTRAL_LLM_API_KEY", "key");
    expect(featureHealth("story")).toEqual({ ok: true });
  });

  it("names the missing variables for narration", () => {
    vi.stubEnv("MURF_API_KEY", "x");
    const health = featureHealth("narration_term");
    expect(health.ok).toBe(false);
    expect(health.ok === false && health.note).not.toContain("MURF_API_KEY");
  });

  it("covers every registered feature", () => {
    for (const feature of FEATURE_IDS) {
      expect(() => featureHealth(feature)).not.toThrow();
    }
  });
});
