import { elevenLabsProvider } from "./providers/elevenlabs";
import { murfProvider } from "./providers/murf";
import type { SpeechProvider, SpeechProviderAdapter, SynthesisRequest } from "./providers/types";

export type { SpeechProvider } from "./providers/types";

export type ProviderSwitches = Record<SpeechProvider, boolean>;

export type ProviderCall = { provider: SpeechProvider; units: number; outcome: "ok" | "failed" };

/** Murf first; ElevenLabs only when Murf is off, unconfigured or fails. */
const PROVIDER_ORDER: SpeechProviderAdapter[] = [murfProvider, elevenLabsProvider];

/** Carries every provider call made, so failed attempts are still counted. */
export class SpeechSynthesisError extends Error {
  constructor(
    message: string,
    readonly calls: ProviderCall[],
  ) {
    super(message);
  }
}

/** Whether each provider's API key is set, regardless of the admin switches. */
export function configuredProviders(): ProviderSwitches {
  return { murf: murfProvider.isConfigured(), elevenlabs: elevenLabsProvider.isConfigured() };
}

export async function synthesizeSpeech(
  request: SynthesisRequest,
  switches: ProviderSwitches,
): Promise<{ audio: Buffer; provider: SpeechProvider; calls: ProviderCall[] }> {
  const calls: ProviderCall[] = [];
  const units = request.script.length;
  const errors: string[] = [];

  for (const adapter of PROVIDER_ORDER) {
    if (!switches[adapter.id] || !adapter.isConfigured()) continue;
    if (adapter.supports && !adapter.supports(request.language)) continue;
    try {
      const audio = await adapter.synthesize(request);
      calls.push({ provider: adapter.id, units, outcome: "ok" });
      return { audio, provider: adapter.id, calls };
    } catch (err) {
      calls.push({ provider: adapter.id, units, outcome: "failed" });
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Narration provider ${adapter.id} failed:`, err);
      errors.push(`${adapter.id}: ${message}`);
    }
  }

  throw new SpeechSynthesisError(
    errors.length > 0 ? errors.join("; ") : "No narration provider is available.",
    calls,
  );
}
