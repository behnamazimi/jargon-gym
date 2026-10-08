import type { CollectionLanguage } from "@/lib/terms/languages";
import { renderPauses, type PauseStyle } from "../pause";
import type { SpeechProviderAdapter } from "./types";

const MODEL: keyof typeof MODELS = "falcon-2";
// Short enough that the fallback still fits in the narration routes' 60 second limit.
const REQUEST_TIMEOUT_MS = 25_000;

// Each voice is native to one language; an English voice reading Dutch mixes the pronunciations.
// A language missing here has no Murf voice (Russian, Turkish), so the router skips Murf for it.
// Ids are the Falcon 2 voices listed in Murf's voice library; not yet confirmed against the account.
const VOICE_BY_LANGUAGE: Partial<Record<CollectionLanguage, { voiceId: string; locale: string }>> =
  {
    en: { voiceId: "en-US-miles", locale: "en-US" },
    nl: { voiceId: "nl-NL-dirk", locale: "nl-NL" },
    es: { voiceId: "es-ES-javier", locale: "es-ES" },
    fr: { voiceId: "fr-FR-axel", locale: "fr-FR" },
    de: { voiceId: "de-DE-ralf", locale: "de-DE" },
    it: { voiceId: "it-IT-angelo", locale: "it-IT" },
    pt: { voiceId: "pt-BR-heitor", locale: "pt-BR" },
    ja: { voiceId: "ja-JP-kenji", locale: "ja-JP" },
    ko: { voiceId: "ko-KR-seok", locale: "ko-KR" },
    zh: { voiceId: "zh-CN-tao", locale: "zh-CN" },
  };

// Lets tests point at a local stub; unset in every real environment.
const endpoint = (url: string) =>
  process.env.MURF_BASE_URL ? url.replace(/^https:\/\/[^/]+/, process.env.MURF_BASE_URL) : url;

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

export function createMurfProvider(modelName: keyof typeof MODELS): SpeechProviderAdapter {
  return {
    id: "murf",
    isConfigured: () => Boolean(process.env.MURF_API_KEY?.trim()),
    supports: (language) => language in VOICE_BY_LANGUAGE,
    async synthesize({ script, language }) {
      const apiKey = process.env.MURF_API_KEY;
      if (!apiKey) throw new Error("Missing MURF_API_KEY.");
      const voice = VOICE_BY_LANGUAGE[language];
      if (!voice) throw new Error(`Murf has no voice for ${language}.`);

      const model = MODELS[modelName];
      const response = await fetch(endpoint(model.endpoint), {
        method: "POST",
        headers: { "api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: renderPauses(script, model.pauses),
          ...voice,
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
}

export const murfProvider = createMurfProvider(MODEL);
