import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { DomainLanguage } from "@/lib/jargon/languages";
import { renderPauses } from "../pause";
import type { SpeechProviderAdapter } from "./types";

const MODEL_ID = "eleven_v3";
const OUTPUT_FORMAT = "mp3_44100_128";

// ElevenLabs' own long-standing default ("Rachel") voice — verify this id
// exists in the target ElevenLabs account (dashboard, or
// elevenlabs.voices.search()) before shipping.
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

// TODO: "nl" reuses the English placeholder voice ID above — it hasn't been
// swapped for a real Dutch voice because voice availability can't be
// verified from this environment. Replace with an actual Dutch voice ID
// from your ElevenLabs dashboard.
const VOICE_BY_LANGUAGE: Record<DomainLanguage, string> = {
  en: DEFAULT_VOICE_ID,
  nl: DEFAULT_VOICE_ID,
};

export const elevenLabsProvider: SpeechProviderAdapter = {
  id: "elevenlabs",
  isConfigured: () => Boolean(process.env.ELEVENLABS_API_KEY?.trim()),
  async synthesize({ script, language }) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("Missing ELEVENLABS_API_KEY.");

    const client = new ElevenLabsClient({ apiKey });
    const audioStream = await client.textToSpeech.convert(
      VOICE_BY_LANGUAGE[language] ?? DEFAULT_VOICE_ID,
      {
        text: renderPauses(script, "elevenlabs"),
        modelId: MODEL_ID,
        outputFormat: OUTPUT_FORMAT,
        languageCode: language,
      },
    );
    return Buffer.from(await new Response(audioStream).arrayBuffer());
  },
};
