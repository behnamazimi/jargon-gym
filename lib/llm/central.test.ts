import { afterEach, describe, expect, it, vi } from "vitest";
import { getCentralLlmConfig } from "./central";

afterEach(() => vi.unstubAllEnvs());

describe("getCentralLlmConfig", () => {
  it("is off without a key", () => {
    vi.stubEnv("CENTRAL_LLM_API_KEY", "");
    expect(getCentralLlmConfig()).toBeNull();
  });

  it("defaults to Google", () => {
    vi.stubEnv("CENTRAL_LLM_API_KEY", " key ");
    vi.stubEnv("CENTRAL_LLM_PROVIDER", "");
    expect(getCentralLlmConfig()).toEqual({ provider: "google", apiKey: "key" });
  });

  it("accepts Anthropic in any case", () => {
    vi.stubEnv("CENTRAL_LLM_API_KEY", "key");
    vi.stubEnv("CENTRAL_LLM_PROVIDER", " Anthropic ");
    expect(getCentralLlmConfig()).toEqual({ provider: "anthropic", apiKey: "key" });
  });

  it("is off, not broken, for an unknown provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("CENTRAL_LLM_API_KEY", "key");
    vi.stubEnv("CENTRAL_LLM_PROVIDER", "openai");
    expect(getCentralLlmConfig()).toBeNull();
  });
});
