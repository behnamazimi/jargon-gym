import { afterEach, describe, expect, it, vi } from "vitest";
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
    vi.stubEnv("SUPABASE_S3_BUCKET", "");
    const health = featureHealth("narration_term");
    expect(health.ok).toBe(false);
    expect(health.ok === false && health.note).not.toContain("MURF_API_KEY");
  });
});
