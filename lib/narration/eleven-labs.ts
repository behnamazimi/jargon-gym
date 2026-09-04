import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const MODEL_ID = "eleven_v3";
// Stock voice for the whole app — verify this id exists in the target
// ElevenLabs account (dashboard, or elevenlabs.voices.search()) before
// shipping. This is ElevenLabs' own long-standing default ("Rachel") voice.
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const OUTPUT_FORMAT = "mp3_44100_128";

function getElevenLabsClient(): ElevenLabsClient {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ELEVENLABS_API_KEY.");
  }
  return new ElevenLabsClient({ apiKey });
}

export async function synthesizeNarrationAudio(script: string): Promise<Buffer> {
  const client = getElevenLabsClient();
  const audioStream = await client.textToSpeech.convert(VOICE_ID, {
    text: script,
    modelId: MODEL_ID,
    outputFormat: OUTPUT_FORMAT,
  });
  const arrayBuffer = await new Response(audioStream).arrayBuffer();
  return Buffer.from(arrayBuffer);
}
