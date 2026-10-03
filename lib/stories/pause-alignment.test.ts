import { describe, expect, it } from "vitest";
import { buildTimeline } from "./highlight";
import { matchBoundariesToPauses, snapTimeline } from "./pause-alignment";
import type { Pause } from "./silence";

const GUARD = 0.08;

describe("matchBoundariesToPauses", () => {
  const pauses: Pause[] = [
    { start: 2.0, end: 2.5 },
    { start: 5.0, end: 5.5 },
    { start: 8.0, end: 8.5 },
  ];

  it("pairs each boundary with the pause near it, in order", () => {
    expect(matchBoundariesToPauses([2.6, 4.6, 8.6], pauses)).toEqual([0, 1, 2]);
  });

  it("never gives two boundaries the same pause", () => {
    const matches = matchBoundariesToPauses([4.9, 5.1], pauses);
    expect(matches.filter((match) => match === 1)).toHaveLength(1);
  });

  it("leaves a boundary alone when no pause is near it", () => {
    expect(matchBoundariesToPauses([2.25, 12], pauses)).toEqual([0, null]);
  });

  it("prefers a long pause to a short one that is a little closer", () => {
    const matches = matchBoundariesToPauses(
      [5.0],
      [
        { start: 4.9, end: 5.02 },
        { start: 5.4, end: 6.0 },
      ],
    );
    expect(matches).toEqual([1]);
  });

  it("takes a short pause only when it sits right on the estimate", () => {
    const shortPause: Pause[] = [{ start: 3.0, end: 3.13 }];
    expect(matchBoundariesToPauses([3.06], shortPause)).toEqual([0]);
    expect(matchBoundariesToPauses([4.5], shortPause)).toEqual([null]);
  });

  it("has nothing to pair without pauses or boundaries", () => {
    expect(matchBoundariesToPauses([1, 2], [])).toEqual([null, null]);
    expect(matchBoundariesToPauses([], pauses)).toEqual([]);
  });
});

describe("snapTimeline", () => {
  const timeline = buildTimeline(
    "Title",
    [{ text: "First sentence here. Second sentence here. Third sentence here." }],
    "en",
  );
  const duration = 30;
  const estimateAt = (share: number) => share * duration;

  it("moves each boundary to the middle of the pause near it", () => {
    const pauses: Pause[] = [
      { start: estimateAt(timeline.titleEnd) + 0.5, end: estimateAt(timeline.titleEnd) + 1 },
      { start: estimateAt(timeline.ends[0]!) - 1.2, end: estimateAt(timeline.ends[0]!) - 0.6 },
      { start: estimateAt(timeline.ends[1]!) + 0.2, end: estimateAt(timeline.ends[1]!) + 0.7 },
    ];
    const snapped = snapTimeline(timeline, pauses, duration);

    expect(snapped.titleEnd * duration).toBeCloseTo((pauses[0]!.start + pauses[0]!.end) / 2);
    expect(snapped.ends[0]! * duration).toBeCloseTo((pauses[1]!.start + pauses[1]!.end) / 2);
    expect(snapped.ends[1]! * duration).toBeCloseTo((pauses[2]!.start + pauses[2]!.end) / 2);
    expect(snapped.ends[2]).toBe(1);
  });

  it("says a sentence is spoken from the end of the pause before to the start of the next", () => {
    const pauses: Pause[] = [
      { start: estimateAt(timeline.titleEnd), end: estimateAt(timeline.titleEnd) + 0.4 },
      { start: estimateAt(timeline.ends[0]!) - 0.2, end: estimateAt(timeline.ends[0]!) + 0.4 },
      { start: estimateAt(timeline.ends[1]!) - 0.2, end: estimateAt(timeline.ends[1]!) + 0.4 },
    ];
    const { speech } = snapTimeline(timeline, pauses, duration);

    expect(speech[0]!.start * duration).toBeCloseTo(pauses[0]!.end - GUARD);
    expect(speech[0]!.end * duration).toBeCloseTo(pauses[1]!.start + GUARD);
    expect(speech[1]!.start * duration).toBeCloseTo(pauses[1]!.end - GUARD);
    expect(speech[2]!.end).toBe(1);
  });

  it("keeps boundaries increasing and every sentence's speech inside its stretch", () => {
    const pauses: Pause[] = [{ start: 12, end: 12.6 }];
    const snapped = snapTimeline(timeline, pauses, duration);
    for (let index = 1; index < snapped.ends.length; index += 1) {
      expect(snapped.ends[index]!).toBeGreaterThanOrEqual(snapped.ends[index - 1]!);
    }
    snapped.speech.forEach((spoken, index) => {
      expect(spoken.end).toBeGreaterThan(spoken.start);
      expect(spoken.end).toBeLessThanOrEqual(snapped.ends[index]! + 1e-9);
    });
  });

  it("shifts a boundary that found no pause along with its neighbours", () => {
    const first = estimateAt(timeline.titleEnd);
    const shift = 1;
    const pauses: Pause[] = [{ start: first + shift - 0.3, end: first + shift + 0.3 }];
    const snapped = snapTimeline(timeline, pauses, duration);
    const later = snapped.ends[0]! * duration;
    expect(later).toBeGreaterThan(estimateAt(timeline.ends[0]!));
    expect(later).toBeLessThan(estimateAt(timeline.ends[0]!) + shift + 0.01);
  });

  it("comes back unchanged without pauses, sentences or a length", () => {
    expect(snapTimeline(timeline, [], duration)).toBe(timeline);
    expect(snapTimeline(timeline, [{ start: 1, end: 2 }], 0)).toBe(timeline);
    const empty = buildTimeline("Title", [], "en");
    expect(snapTimeline(empty, [{ start: 1, end: 2 }], duration)).toBe(empty);
  });

  it("changes the highlight in the middle of the near-silence, after playback has stopped", () => {
    const end = estimateAt(timeline.ends[0]!);
    const pause: Pause = {
      start: end - 0.5,
      end: end + 0.5,
      quiet: { start: end + 0.1, end: end + 0.5 },
    };
    const { ends, speech } = snapTimeline(timeline, [pause], duration);
    expect(ends[0]! * duration).toBeCloseTo(end + 0.3);
    expect(speech[0]!.end).toBeLessThan(ends[0]!);
  });

  it("plays from the near-silence, not the broader pause, when a pause has one", () => {
    const pause: Pause = {
      start: estimateAt(timeline.ends[0]!) - 0.5,
      end: estimateAt(timeline.ends[0]!) + 0.5,
      quiet: {
        start: estimateAt(timeline.ends[0]!) - 0.2,
        end: estimateAt(timeline.ends[0]!) + 0.4,
      },
    };
    const { speech } = snapTimeline(timeline, [pause], duration);
    expect(speech[0]!.end * duration).toBeCloseTo(pause.quiet!.start + GUARD);
    expect(speech[1]!.start * duration).toBeCloseTo(pause.quiet!.end - GUARD);
  });

  describe("with speaker labels", () => {
    const dialogue = buildTimeline(
      "Title",
      [
        {
          text: "Ann: First sentence is right here today. Bob: Second sentence is right here today. Cy: Third one.",
        },
      ],
      "en",
    );
    const endOfFirst = dialogue.ends[0]! * duration;
    // The voice pauses after "Bob:" for longer than it does between sentences,
    // and that pause is the closer one to where the estimate expects the end.
    const betweenSentences: Pause = { start: endOfFirst - 1.2, end: endOfFirst - 0.6 };
    const afterLabel: Pause = { start: endOfFirst + 0.1, end: endOfFirst + 0.9 };

    it("ends a sentence at the pause before the next speaker, not the one after their name", () => {
      const snapped = snapTimeline(dialogue, [betweenSentences, afterLabel], duration);
      expect(snapped.ends[0]! * duration).toBeCloseTo(
        (betweenSentences.start + betweenSentences.end) / 2,
      );
    });

    it("leaves a label with no pause after it out of the way", () => {
      const snapped = snapTimeline(dialogue, [betweenSentences], duration);
      expect(snapped.ends[0]! * duration).toBeCloseTo(
        (betweenSentences.start + betweenSentences.end) / 2,
      );
    });

    it("lets a sentence take a pause ahead of a label that is nearer to it", () => {
      const onlyPause: Pause = { start: endOfFirst + 0.3, end: endOfFirst + 0.9 };
      expect(
        matchBoundariesToPauses([endOfFirst, endOfFirst + 1.4], [onlyPause], [1, 0.5]),
      ).toEqual([0, null]);
    });

    it("starts the next sentence where the speaker's name starts", () => {
      const snapped = snapTimeline(dialogue, [betweenSentences, afterLabel], duration);
      expect(snapped.speech[0]!.end * duration).toBeCloseTo(betweenSentences.start + GUARD);
      expect(snapped.speech[1]!.start * duration).toBeCloseTo(betweenSentences.end - GUARD);
    });
  });
});
