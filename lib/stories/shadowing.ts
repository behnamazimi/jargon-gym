/** How long the pause after a sentence is, as a multiple of the sentence. */
export const SHADOWING_GAPS = [1, 1.5, 2] as const;
export type ShadowingGap = (typeof SHADOWING_GAPS)[number];

/** How many times a looped sentence plays; 0 plays it until looping is turned off. */
export const SHADOWING_REPEATS = [2, 3, 5, 0] as const;
export type ShadowingRepeats = (typeof SHADOWING_REPEATS)[number];

export type ShadowingSettings = {
  pause: boolean;
  gap: ShadowingGap;
  repeats: ShadowingRepeats;
};

export function isShadowingGap(value: unknown): value is ShadowingGap {
  return (SHADOWING_GAPS as readonly unknown[]).includes(value);
}

export function isShadowingRepeats(value: unknown): value is ShadowingRepeats {
  return (SHADOWING_REPEATS as readonly unknown[]).includes(value);
}

export type SentenceEndStep =
  /** Play the same sentence again after the pause. */
  | { type: "repeat"; gapMs: number }
  /** Carry on into the next sentence after the pause. */
  | { type: "advance"; gapMs: number }
  /** Nothing follows this sentence, so let the clip run out. */
  | { type: "finish" };

/** What to do the moment a sentence has been spoken. `playsDone` counts the
 *  plays of this sentence so far, including the one that just ended. */
export function stepAtSentenceEnd({
  settings,
  loop,
  playsDone,
  isLast,
  sentenceSeconds,
  speed,
}: {
  settings: ShadowingSettings;
  loop: boolean;
  playsDone: number;
  isLast: boolean;
  sentenceSeconds: number;
  speed: number;
}): SentenceEndStep {
  const gapMs = settings.pause ? Math.round((sentenceSeconds / speed) * settings.gap * 1000) : 0;
  if (loop && (settings.repeats === 0 || playsDone < settings.repeats)) {
    return { type: "repeat", gapMs };
  }
  return isLast ? { type: "finish" } : { type: "advance", gapMs };
}

const RESTART_AFTER_SECONDS = 1;

/** The sentence "previous" goes to: the current one again once you are more
 *  than a moment into it, otherwise the one before. */
export function previousSentenceIndex(
  activeSentence: number | null,
  secondsIntoSentence: number,
): number {
  if (activeSentence === null) return 0;
  if (secondsIntoSentence > RESTART_AFTER_SECONDS) return activeSentence;
  return Math.max(activeSentence - 1, 0);
}
