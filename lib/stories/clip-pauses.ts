import { findPauses, loudnessEnvelope, type ClipPauses } from "./silence";

const DECODE_SAMPLE_RATE = 22050;

/** Downloads the narration and finds its pauses. Resolves to null when the
 *  browser can't decode it or the request fails, so the estimates stay. */
export async function detectClipPauses(
  src: string,
  signal: AbortSignal,
): Promise<ClipPauses | null> {
  try {
    const response = await fetch(src, { signal });
    if (!response.ok) return null;
    const bytes = await response.arrayBuffer();
    // An offline context decodes without needing a tap to start audio.
    const context = new OfflineAudioContext(1, 1, DECODE_SAMPLE_RATE);
    const clip = await context.decodeAudioData(bytes);
    if (signal.aborted) return null;
    const pauses = findPauses(loudnessEnvelope(clip.getChannelData(0), clip.sampleRate));
    return { pauses, duration: clip.duration };
  } catch {
    return null;
  }
}
