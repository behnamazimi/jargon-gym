import { beforeEach, describe, expect, it, vi } from "vitest";

const murf = vi.hoisted(() => ({ id: "murf", isConfigured: vi.fn(), synthesize: vi.fn() }));
const eleven = vi.hoisted(() => ({ id: "elevenlabs", isConfigured: vi.fn(), synthesize: vi.fn() }));

vi.mock("./providers/murf", () => ({ murfProvider: murf }));
vi.mock("./providers/elevenlabs", () => ({ elevenLabsProvider: eleven }));
vi.spyOn(console, "error").mockImplementation(() => undefined);

const { synthesizeSpeech, SpeechSynthesisError, configuredProviders } = await import("./provider");

const request = { script: "Closure.", language: "en" as const, kind: "term" as const };
const both = { murf: true, elevenlabs: true };

beforeEach(() => {
  vi.resetAllMocks();
  murf.isConfigured.mockReturnValue(true);
  eleven.isConfigured.mockReturnValue(true);
  murf.synthesize.mockResolvedValue(Buffer.from("murf"));
  eleven.synthesize.mockResolvedValue(Buffer.from("eleven"));
});

describe("synthesizeSpeech", () => {
  it("uses Murf first and does not call ElevenLabs", async () => {
    const result = await synthesizeSpeech(request, both);
    expect(result.provider).toBe("murf");
    expect(result.calls).toEqual([{ provider: "murf", units: 8, outcome: "ok" }]);
    expect(eleven.synthesize).not.toHaveBeenCalled();
  });

  it("falls back to ElevenLabs when Murf fails and reports both calls", async () => {
    murf.synthesize.mockRejectedValue(new Error("down"));
    const result = await synthesizeSpeech(request, both);
    expect(result.provider).toBe("elevenlabs");
    expect(result.audio.toString()).toBe("eleven");
    expect(result.calls.map((c) => [c.provider, c.outcome])).toEqual([
      ["murf", "failed"],
      ["elevenlabs", "ok"],
    ]);
  });

  it("skips a provider that is switched off", async () => {
    const result = await synthesizeSpeech(request, { murf: false, elevenlabs: true });
    expect(result.provider).toBe("elevenlabs");
    expect(murf.synthesize).not.toHaveBeenCalled();
  });

  it("skips a provider with no key", async () => {
    murf.isConfigured.mockReturnValue(false);
    expect((await synthesizeSpeech(request, both)).provider).toBe("elevenlabs");
  });

  it("does not fall back to a provider the admin switched off", async () => {
    murf.synthesize.mockRejectedValue(new Error("down"));
    await expect(synthesizeSpeech(request, { murf: true, elevenlabs: false })).rejects.toThrow(
      "murf: down",
    );
    expect(eleven.synthesize).not.toHaveBeenCalled();
  });

  it("throws with every attempt when all fail", async () => {
    murf.synthesize.mockRejectedValue(new Error("a"));
    eleven.synthesize.mockRejectedValue(new Error("b"));
    const error = await synthesizeSpeech(request, both).catch((e) => e);
    expect(error).toBeInstanceOf(SpeechSynthesisError);
    expect(error.message).toBe("murf: a; elevenlabs: b");
    expect(error.calls).toHaveLength(2);
  });

  it("says so when no provider is usable", async () => {
    const error = await synthesizeSpeech(request, { murf: false, elevenlabs: false }).catch(
      (e) => e,
    );
    expect(error.message).toBe("No narration provider is available.");
    expect(error.calls).toEqual([]);
  });
});

describe("configuredProviders", () => {
  it("reports which keys are set", () => {
    eleven.isConfigured.mockReturnValue(false);
    expect(configuredProviders()).toEqual({ murf: true, elevenlabs: false });
  });
});
