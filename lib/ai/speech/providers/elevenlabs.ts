import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { CollectionLanguage } from "@/lib/terms/languages";
import { renderPauses } from "../pause";
import type { SpeechProviderAdapter } from "./types";

const MODEL_ID = "eleven_v3";
const OUTPUT_FORMAT = "mp3_44100_128";
// Murf has the same limit, so the two together fit in the narration routes' 60 seconds.
const REQUEST_TIMEOUT_MS = 25_000;

// ElevenLabs' own long-standing default ("Rachel") voice — verify this id
// exists in the target ElevenLabs account (dashboard, or
// elevenlabs.voices.search()) before shipping.
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

// TODO: every language except "en" reuses the English placeholder voice ID
// above, so a non-English clip is read with an English-accented voice. None
// has been swapped for a native voice because voice availability can't be
// verified from this environment. Replace each with a real voice ID from your
// ElevenLabs dashboard.
const VOICE_BY_LANGUAGE: Record<CollectionLanguage, string> = {
  en: DEFAULT_VOICE_ID,
  nl: DEFAULT_VOICE_ID,
  es: DEFAULT_VOICE_ID,
  fr: DEFAULT_VOICE_ID,
  de: DEFAULT_VOICE_ID,
  it: DEFAULT_VOICE_ID,
  pt: DEFAULT_VOICE_ID,
  ru: DEFAULT_VOICE_ID,
  tr: DEFAULT_VOICE_ID,
  ja: DEFAULT_VOICE_ID,
  ko: DEFAULT_VOICE_ID,
  zh: DEFAULT_VOICE_ID,
};

export const elevenLabsProvider: SpeechProviderAdapter = {
  id: "elevenlabs",
  isConfigured: () => Boolean(process.env.ELEVENLABS_API_KEY?.trim()),
  async synthesize({ script, language }) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("Missing ELEVENLABS_API_KEY.");

    const client = new ElevenLabsClient({
      apiKey,
      baseUrl: process.env.ELEVENLABS_BASE_URL || undefined,
    });
    const audioStream = await client.textToSpeech.convert(
      VOICE_BY_LANGUAGE[language] ?? DEFAULT_VOICE_ID,
      {
        text: renderPauses(script, "elevenlabs"),
        modelId: MODEL_ID,
        outputFormat: OUTPUT_FORMAT,
        languageCode: language,
      },
      // The signal also covers reading the audio, which the SDK's own timeout doesn't.
      {
        timeoutInSeconds: REQUEST_TIMEOUT_MS / 1000,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
    return Buffer.from(await new Response(audioStream).arrayBuffer());
  },
};
