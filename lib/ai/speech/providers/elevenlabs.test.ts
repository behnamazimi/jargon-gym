import { beforeEach, describe, expect, it, vi } from "vitest";
import { NARRATION_PAUSE } from "../pause";

const convert = vi.hoisted(() => vi.fn());

vi.mock("@elevenlabs/elevenlabs-js", () => ({
  ElevenLabsClient: class {
    textToSpeech = { convert };
  },
}));

const { elevenLabsProvider } = await import("./elevenlabs");

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ELEVENLABS_API_KEY", "key");
  convert.mockResolvedValue(new Response(Buffer.from("mp3")).body);
});

describe("elevenLabsProvider", () => {
  it("is configured only with a key", () => {
    expect(elevenLabsProvider.isConfigured()).toBe(true);
    vi.stubEnv("ELEVENLABS_API_KEY", " ");
    expect(elevenLabsProvider.isConfigured()).toBe(false);
  });

  it("gives up after 25 seconds and never retries, so a failed clip can be refunded in time", async () => {
    await elevenLabsProvider.synthesize({ script: "Closure.", language: "en", kind: "term" });
    const options = convert.mock.calls[0][2];
    expect(options).toMatchObject({ timeoutInSeconds: 25, maxRetries: 0 });
    expect(options.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("writes pauses as dashes and returns the audio", async () => {
    const audio = await elevenLabsProvider.synthesize({
      script: `Closure. ${NARRATION_PAUSE} For example, x.`,
      language: "en",
      kind: "term",
    });
    expect(audio.toString()).toBe("mp3");
    expect(convert.mock.calls[0][1]).toMatchObject({
      text: "Closure.  -- --  For example, x.",
      languageCode: "en",
    });
  });

  it("fails without a key", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    await expect(
      elevenLabsProvider.synthesize({ script: "x", language: "en", kind: "term" }),
    ).rejects.toThrow("Missing ELEVENLABS_API_KEY");
  });
});
