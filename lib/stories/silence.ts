/** A quiet stretch in the clip, in seconds. `quiet` is the part of it that is
 *  near-silent, once the soft tails of the sounds around it are left out; where
 *  it is missing the whole stretch counts. */
export type Pause = { start: number; end: number; quiet?: { start: number; end: number } };

/** What measuring a clip gives back. */
export type ClipPauses = { pauses: Pause[]; duration: number };

const WINDOW_SECONDS = 0.01;
/** How loud the voice usually is: the level most of its speech is below. */
const SPEECH_PERCENTILE = 0.9;
/** The quietest windows are the clip's noise floor. */
const NOISE_PERCENTILE = 0.05;
/** A window is quiet when it is this much below how loud the voice usually is. */
const QUIET_RATIO = 0.1;
// Sentences trail off into soft sounds (an "s", a breath) well below that, so the
// near-silent core of a pause is judged against the clip's own noise floor
// instead, within these limits relative to the voice.
const NOISE_HEADROOM = 3;
const QUIETEST_RATIO = 0.001;
const LOUDEST_CORE_RATIO = 0.03;
/** Shorter gaps are consonants and breaths, not a pause between sentences. */
const MIN_PAUSE_SECONDS = 0.12;

/** The loudness of a clip over time, one value per 10 ms. */
export function loudnessEnvelope(samples: Float32Array, sampleRate: number): Float32Array {
  const windowSize = Math.max(1, Math.round(sampleRate * WINDOW_SECONDS));
  const envelope = new Float32Array(Math.ceil(samples.length / windowSize));
  for (let window = 0; window < envelope.length; window += 1) {
    const from = window * windowSize;
    const to = Math.min(from + windowSize, samples.length);
    let sum = 0;
    for (let i = from; i < to; i += 1) sum += samples[i]! * samples[i]!;
    envelope[window] = Math.sqrt(sum / (to - from));
  }
  return envelope;
}

/** The longest stretch of windows within [from, to) below the threshold. */
function longestRunBelow(envelope: Float32Array, from: number, to: number, threshold: number) {
  let best: { start: number; end: number } | null = null;
  let runStart: number | null = null;
  for (let window = from; window <= to; window += 1) {
    const below = window < to && envelope[window]! < threshold;
    if (below && runStart === null) runStart = window;
    if (!below && runStart !== null) {
      if (!best || window - runStart > best.end - best.start)
        best = { start: runStart, end: window };
      runStart = null;
    }
  }
  return best;
}

/** The quiet stretches inside the clip. Silence before the first word and after
 *  the last one is left out, since no sentence ends there. */
export function findPauses(envelope: Float32Array): Pause[] {
  if (envelope.length === 0) return [];
  const sorted = [...envelope].sort((a, b) => a - b);
  const levelAt = (percentile: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * percentile))]!;
  const speechLevel = levelAt(SPEECH_PERCENTILE);
  if (speechLevel <= 0) return [];

  const threshold = speechLevel * QUIET_RATIO;
  const coreThreshold = Math.min(
    Math.max(levelAt(NOISE_PERCENTILE) * NOISE_HEADROOM, speechLevel * QUIETEST_RATIO),
    speechLevel * LOUDEST_CORE_RATIO,
  );
  const seconds = (window: number) => window * WINDOW_SECONDS;

  const pauses: Pause[] = [];
  let runStart: number | null = null;
  for (let window = 0; window <= envelope.length; window += 1) {
    const quiet = window < envelope.length && envelope[window]! < threshold;
    if (quiet && runStart === null) runStart = window;
    if (!quiet && runStart !== null) {
      const touchesEdge = runStart === 0 || window === envelope.length;
      if (!touchesEdge && seconds(window - runStart) >= MIN_PAUSE_SECONDS) {
        const core = longestRunBelow(envelope, runStart, window, coreThreshold);
        pauses.push({
          start: seconds(runStart),
          end: seconds(window),
          ...(core && { quiet: { start: seconds(core.start), end: seconds(core.end) } }),
        });
      }
      runStart = null;
    }
  }
  return pauses;
}
