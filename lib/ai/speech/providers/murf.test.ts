import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NARRATION_PAUSE } from "../pause";
import { murfProvider } from "./murf";

const fetchMock = vi.fn();

const request = { script: "Closure.", language: "en" as const, kind: "term" as const };

function sentBody(): Record<string, unknown> {
  return JSON.parse(fetchMock.mock.calls[0][1].body as string);
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("MURF_API_KEY", "key");
  fetchMock.mockResolvedValue(new Response(Buffer.from("mp3")));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fetchMock.mockReset();
});

describe("murfProvider (Falcon 2)", () => {
  it("is configured only with a key", () => {
    expect(murfProvider.isConfigured()).toBe(true);
    vi.stubEnv("MURF_API_KEY", " ");
    expect(murfProvider.isConfigured()).toBe(false);
  });

  it("calls the streaming endpoint with the key and returns the raw audio", async () => {
    const audio = await murfProvider.synthesize(request);
    expect(audio.toString()).toBe("mp3");
    expect(fetchMock.mock.calls[0][0]).toBe("https://global.api.murf.ai/v1/speech/stream");
    expect(fetchMock.mock.calls[0][1].headers["api-key"]).toBe("key");
    expect(sentBody()).toMatchObject({
      model: "falcon-2",
      voiceId: "en-US-miles",
      locale: "en-US",
      format: "MP3",
    });
    expect(sentBody()).not.toHaveProperty("encodeAsBase64");
    expect(sentBody()).not.toHaveProperty("modelVersion");
  });

  it("asks for the Dutch locale for Dutch collections", async () => {
    await murfProvider.synthesize({ ...request, language: "nl" });
    expect(sentBody().locale).toBe("nl-NL");
  });

  it("sends no pause markers to Falcon 2", async () => {
    await murfProvider.synthesize({
      ...request,
      script: `Closure. ${NARRATION_PAUSE} For example, x.`,
    });
    expect(sentBody().text).toBe("Closure. For example, x.");
  });

  it("fails on an error response or empty audio", async () => {
    fetchMock.mockResolvedValue(new Response("quota", { status: 402 }));
    await expect(murfProvider.synthesize(request)).rejects.toThrow("Murf returned 402: quota");

    fetchMock.mockResolvedValue(new Response(null));
    await expect(murfProvider.synthesize(request)).rejects.toThrow("no audio");
  });
});
