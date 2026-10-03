import type { StoryTimeline } from "./highlight";
import type { Pause } from "./silence";

/** The estimate can be off by seconds, so a pause further than this from where a
 *  sentence is expected to end is not that sentence's pause. */
const MATCH_WINDOW_SECONDS = 2;
/** A pause this long or longer counts fully as a sentence-end pause. */
const FULL_PAUSE_SECONDS = 0.5;
const SHORTEST_COUNTED_SECONDS = 0.1;
// A match must score above zero. Longer pauses count most, so a short comma
// pause is only taken when it sits right on the estimate.
const NEARNESS_WEIGHT = 0.35;
const LENGTH_WEIGHT = 0.65;
const MATCH_THRESHOLD = 0.3;

function matchScore(estimate: number, pause: Pause): number {
  const distance = Math.abs((pause.start + pause.end) / 2 - estimate);
  if (distance > MATCH_WINDOW_SECONDS) return 0;
  const nearness = 1 - distance / MATCH_WINDOW_SECONDS;
  const length = Math.min(
    Math.max(
      (pause.end - pause.start - SHORTEST_COUNTED_SECONDS) /
        (FULL_PAUSE_SECONDS - SHORTEST_COUNTED_SECONDS),
      0,
    ),
    1,
  );
  return NEARNESS_WEIGHT * nearness + LENGTH_WEIGHT * length - MATCH_THRESHOLD;
}

/** Pairs each expected boundary (in seconds, in order) with a pause, or with
 *  nothing. The pairing is done for all of them at once and keeps the order,
 *  so two boundaries never take the same pause and a pause is never skipped
 *  backwards. A boundary with a lower weight counts for less, so it only takes
 *  a pause that a heavier one has no better use for. Returns the index of the
 *  chosen pause for each boundary. */
export function matchBoundariesToPauses(
  estimates: number[],
  pauses: Pause[],
  weights: number[] = [],
): (number | null)[] {
  const rows = estimates.length + 1;
  const columns = pauses.length + 1;
  const best = new Float64Array(rows * columns);
  const at = (i: number, j: number) => i * columns + j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < columns; j += 1) {
      const score = matchScore(estimates[i - 1]!, pauses[j - 1]!) * (weights[i - 1] ?? 1);
      let value = Math.max(best[at(i - 1, j)]!, best[at(i, j - 1)]!);
      if (score > 0) value = Math.max(value, best[at(i - 1, j - 1)]! + score);
      best[at(i, j)] = value;
    }
  }

  const matches: (number | null)[] = estimates.map(() => null);
  let i = rows - 1;
  let j = columns - 1;
  while (i > 0 && j > 0) {
    const score = matchScore(estimates[i - 1]!, pauses[j - 1]!) * (weights[i - 1] ?? 1);
    if (score > 0 && best[at(i, j)] === best[at(i - 1, j - 1)]! + score) {
      matches[i - 1] = j - 1;
      i -= 1;
      j -= 1;
    } else if (best[at(i, j)] === best[at(i - 1, j)]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }
  return matches;
}

/** Moves a boundary that found no pause by the same amount as its neighbours
 *  that did, so one missed pause doesn't leave it as far off as the estimate. */
function interpolate(anchors: [number, number][], estimate: number): number {
  let before = anchors[0]!;
  let after = anchors[anchors.length - 1]!;
  for (const anchor of anchors) {
    if (anchor[0] <= estimate) before = anchor;
    if (anchor[0] >= estimate) {
      after = anchor;
      break;
    }
  }
  if (after[0] === before[0]) return before[1];
  return before[1] + ((estimate - before[0]) / (after[0] - before[0])) * (after[1] - before[1]);
}

/** A speaker label such as "Elena:" at the start of a sentence. Voices pause
 *  after the colon, often for longer than between sentences. */
const SPEAKER_LABEL = /^\s*[\p{L}][\p{L}\p{N} .'’-]{0,24}:\s/u;

/** How far into a sentence's text its speaker label ends, from 0 to 1; 0 when
 *  it has none. */
function labelShare(timeline: StoryTimeline, index: number): number {
  const sentence = timeline.paragraphs.flat().find((candidate) => candidate.index === index);
  const text = sentence?.segments.map((segment) => segment.text).join("") ?? "";
  const label = SPEAKER_LABEL.exec(text)?.[0].trimEnd().length ?? 0;
  const spoken = text.trim().length;
  return label > 0 && label < spoken ? label / spoken : 0;
}

/** Playback stops this long after the near-silence begins and starts this long
 *  before it ends, so a soft last or first sound is never cut (shorter on a short
 *  pause, where it can't pass the middle). */
const GUARD_SECONDS = 0.08;

/** Where the highlight changes: the middle of the near-silence, which is always
 *  after the point playback stops at. */
function middleOf(pause: Pause): number {
  const { start, end } = pause.quiet ?? pause;
  return (start + end) / 2;
}

function stopAfter(pause: Pause): number {
  const { start, end } = pause.quiet ?? pause;
  return start + Math.min(GUARD_SECONDS, (end - start) / 2);
}

function startBefore(pause: Pause): number {
  const { start, end } = pause.quiet ?? pause;
  return end - Math.min(GUARD_SECONDS, (end - start) / 2);
}

/** Not every story has speaker labels, and a voice may not pause after one. So
 *  a label's pause counts for less than a sentence's: it is only there to keep
 *  the pause after a name from being taken for the end of the sentence. */
const LABEL_WEIGHT = 0.5;

type Slot = {
  /** Where the pause is expected, in seconds. */
  estimate: number;
  /** The title's end is 0 and the end of sentence i is i + 1. A pause after a
   *  speaker label has none: it is matched so the sentence's own pause can't
   *  take it, but nothing moves to it. */
  boundary: number | null;
  weight: number;
};

/** Where pauses are expected, in order: after the title, after each speaker
 *  label, and after each sentence but the last (which ends with the clip). */
function expectedPauses(timeline: StoryTimeline, durationSeconds: number): Slot[] {
  const count = timeline.ends.length;
  const slots: Slot[] = [{ estimate: timeline.titleEnd * durationSeconds, boundary: 0, weight: 1 }];
  for (let index = 0; index < count; index += 1) {
    const start = index === 0 ? timeline.titleEnd : timeline.ends[index - 1]!;
    const end = timeline.ends[index]!;
    const label = labelShare(timeline, index);
    if (label > 0) {
      slots.push({
        estimate: (start + label * (end - start)) * durationSeconds,
        boundary: null,
        weight: LABEL_WEIGHT,
      });
    }
    if (index < count - 1)
      slots.push({ estimate: end * durationSeconds, boundary: index + 1, weight: 1 });
  }
  return slots;
}

/** The timeline with its sentence boundaries moved onto the pauses found in the
 *  clip. Each boundary is the middle of its pause's near-silence, where the
 *  highlight changes;
 *  a sentence is spoken from just before the pause ahead of it ends to just
 *  after the pause behind it begins. Boundaries with no pause keep the estimate, adjusted by
 *  their neighbours. With nothing to go on the timeline comes back unchanged. */
export function snapTimeline(
  timeline: StoryTimeline,
  pauses: Pause[],
  durationSeconds: number,
): StoryTimeline {
  const count = timeline.ends.length;
  if (count === 0 || pauses.length === 0 || !(durationSeconds > 0)) return timeline;

  const slots = expectedPauses(timeline, durationSeconds);
  const matches = matchBoundariesToPauses(
    slots.map((slot) => slot.estimate),
    pauses,
    slots.map((slot) => slot.weight),
  );

  const anchors: [number, number][] = [[0, 0]];
  slots.forEach((slot, index) => {
    const match = matches[index];
    if (match === null || match === undefined) return;
    anchors.push([slot.estimate, middleOf(pauses[match]!)]);
  });
  anchors.push([durationSeconds, durationSeconds]);

  // One entry per boundary: the title's end, then each sentence's end but the last.
  const matchOf: (Pause | null)[] = Array.from({ length: count }, () => null);
  const seconds: number[] = Array.from({ length: count }, () => 0);
  slots.forEach((slot, index) => {
    if (slot.boundary === null) return;
    const match = matches[index];
    const pause = match === null || match === undefined ? null : pauses[match]!;
    matchOf[slot.boundary] = pause;
    seconds[slot.boundary] = pause ? middleOf(pause) : interpolate(anchors, slot.estimate);
  });
  const shares = seconds.map((value) => value / durationSeconds);
  const ends = [...shares.slice(1), 1];

  // The start of sentence i is boundary i; its end is boundary i + 1.
  const spokenFrom = (boundary: number) =>
    matchOf[boundary] ? startBefore(matchOf[boundary]!) / durationSeconds : shares[boundary]!;
  const spokenTo = (boundary: number) => {
    if (boundary >= count) return 1;
    return matchOf[boundary] ? stopAfter(matchOf[boundary]!) / durationSeconds : shares[boundary]!;
  };
  const speech = ends.map((end, index) => {
    const start = spokenFrom(index);
    const stop = spokenTo(index + 1);
    if (stop > start) return { start, end: stop };
    return { start: index === 0 ? shares[0]! : ends[index - 1]!, end };
  });

  return { ...timeline, titleEnd: shares[0]!, ends, speech };
}
