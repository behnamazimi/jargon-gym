import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { DomainLanguage } from "@/lib/jargon/languages";

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

function getElevenLabsClient(): ElevenLabsClient {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ELEVENLABS_API_KEY.");
  }
  return new ElevenLabsClient({ apiKey });
}

export async function synthesizeNarrationAudio(
  script: string,
  language: DomainLanguage,
): Promise<Buffer> {
  const client = getElevenLabsClient();
  const voiceId = VOICE_BY_LANGUAGE[language] ?? DEFAULT_VOICE_ID;

  const audioStream = await client.textToSpeech.convert(voiceId, {
    text: script,
    modelId: MODEL_ID,
    outputFormat: OUTPUT_FORMAT,
    languageCode: language,
  });
  const arrayBuffer = await new Response(audioStream).arrayBuffer();
  return Buffer.from(arrayBuffer);
}
