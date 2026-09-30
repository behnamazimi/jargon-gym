import type { DomainLanguage } from "@/lib/jargon/languages";
import { renderPauses, type PauseStyle } from "../pause";
import type { SpeechProviderAdapter } from "./types";

const MODEL: keyof typeof MODELS = "falcon-2";
const REQUEST_TIMEOUT_MS = 60_000;

// One voice for every language for now; Murf reads the locale below.
const VOICE_ID = "en-US-miles";
const LOCALE_BY_LANGUAGE: Record<DomainLanguage, string> = {
  en: "en-US",
  nl: "nl-NL",
};

const MODELS = {
  // Gen2 has a JSON endpoint that can return the audio as base64.
  gen2: {
    endpoint: "https://api.murf.ai/v1/speech/generate",
    pauses: "murf" satisfies PauseStyle,
    body: { modelVersion: "GEN2", style: "Narration", pitch: -5, rate: -5, encodeAsBase64: true },
    async readAudio(response: Response) {
      const body = (await response.json()) as { encodedAudio?: string };
      return body.encodedAudio ? Buffer.from(body.encodedAudio, "base64") : null;
    },
  },
  // Falcon 2 is only served by the streaming endpoint, which replies with raw audio.
  "falcon-2": {
    endpoint: "https://global.api.murf.ai/v1/speech/stream",
    // Conversational already, and it ignores pause tags.
    pauses: "none" satisfies PauseStyle,
    body: { model: "falcon-2", style: "Conversational" },
    async readAudio(response: Response) {
      return Buffer.from(await response.arrayBuffer());
    },
  },
} as const;

export const murfProvider: SpeechProviderAdapter = {
  id: "murf",
  isConfigured: () => Boolean(process.env.MURF_API_KEY?.trim()),
  async synthesize({ script, language }) {
    const apiKey = process.env.MURF_API_KEY;
    if (!apiKey) throw new Error("Missing MURF_API_KEY.");

    const model = MODELS[MODEL];
    console.log("================================================");
    console.log("Model:", MODEL);
    console.log("Pauses:", renderPauses(script, model.pauses));
    console.log("================================================");

    const response = await fetch(model.endpoint, {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: renderPauses(script, model.pauses),
        voiceId: VOICE_ID,
        locale: LOCALE_BY_LANGUAGE[language],
        format: "MP3",
        ...model.body,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      throw new Error(`Murf returned ${response.status}${detail ? `: ${detail}` : ""}`);
    }

    const audio = await model.readAudio(response);
    if (!audio || audio.length === 0) throw new Error("Murf returned no audio.");
    return audio;
  },
};
