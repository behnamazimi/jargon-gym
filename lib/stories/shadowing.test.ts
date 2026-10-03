import { describe, expect, it } from "vitest";
import {
  isShadowingGap,
  isShadowingRepeats,
  previousSentenceIndex,
  stepAtSentenceEnd,
  type ShadowingSettings,
} from "./shadowing";

const SETTINGS: ShadowingSettings = { pause: true, gap: 1, repeats: 3 };

function stepWith(overrides: Partial<Parameters<typeof stepAtSentenceEnd>[0]> = {}) {
  return stepAtSentenceEnd({
    settings: SETTINGS,
    loop: false,
    playsDone: 1,
    isLast: false,
    sentenceSeconds: 4,
    speed: 1,
    ...overrides,
  });
}

describe("stepAtSentenceEnd", () => {
  it("pauses for as long as the sentence took, then moves on", () => {
    expect(stepWith()).toEqual({ type: "advance", gapMs: 4000 });
  });

  it("scales the pause by the setting", () => {
    expect(stepWith({ settings: { ...SETTINGS, gap: 1.5 } })).toEqual({
      type: "advance",
      gapMs: 6000,
    });
    expect(stepWith({ settings: { ...SETTINGS, gap: 2 } })).toEqual({
      type: "advance",
      gapMs: 8000,
    });
  });

  it("measures the pause in real time, so slower playback gets a longer one", () => {
    expect(stepWith({ speed: 0.5 })).toEqual({ type: "advance", gapMs: 8000 });
    expect(stepWith({ speed: 1.5 })).toEqual({ type: "advance", gapMs: 2667 });
  });

  it("runs straight on when pausing is off", () => {
    expect(stepWith({ settings: { ...SETTINGS, pause: false } })).toEqual({
      type: "advance",
      gapMs: 0,
    });
  });

  it("lets the clip finish after the last sentence", () => {
    expect(stepWith({ isLast: true })).toEqual({ type: "finish" });
  });

  it("repeats a looped sentence until it has played the chosen number of times", () => {
    expect(stepWith({ loop: true, playsDone: 1 })).toEqual({ type: "repeat", gapMs: 4000 });
    expect(stepWith({ loop: true, playsDone: 2 })).toEqual({ type: "repeat", gapMs: 4000 });
    expect(stepWith({ loop: true, playsDone: 3 })).toEqual({ type: "advance", gapMs: 4000 });
  });

  it("repeats back to back when looping without pauses", () => {
    expect(stepWith({ loop: true, settings: { ...SETTINGS, pause: false } })).toEqual({
      type: "repeat",
      gapMs: 0,
    });
  });

  it("keeps repeating while looping is endless", () => {
    expect(stepWith({ loop: true, playsDone: 40, settings: { ...SETTINGS, repeats: 0 } })).toEqual({
      type: "repeat",
      gapMs: 4000,
    });
  });

  it("finishes the last sentence once its repeats are done", () => {
    expect(stepWith({ loop: true, playsDone: 3, isLast: true })).toEqual({ type: "finish" });
    expect(stepWith({ loop: true, playsDone: 1, isLast: true })).toEqual({
      type: "repeat",
      gapMs: 4000,
    });
  });
});

describe("previousSentenceIndex", () => {
  it("restarts the current sentence once you are well into it", () => {
    expect(previousSentenceIndex(3, 2.5)).toBe(3);
  });

  it("goes to the sentence before when you are at the start of this one", () => {
    expect(previousSentenceIndex(3, 0.4)).toBe(2);
  });

  it("restarts the first sentence instead of going before it", () => {
    expect(previousSentenceIndex(0, 0.2)).toBe(0);
  });

  it("starts from the first sentence while the title is being read", () => {
    expect(previousSentenceIndex(null, 3)).toBe(0);
  });
});

describe("setting guards", () => {
  it("accepts only the offered pause lengths", () => {
    expect(isShadowingGap(1.5)).toBe(true);
    expect(isShadowingGap(3)).toBe(false);
    expect(isShadowingGap("1")).toBe(false);
  });

  it("accepts only the offered repeat counts, with 0 meaning endless", () => {
    expect(isShadowingRepeats(0)).toBe(true);
    expect(isShadowingRepeats(5)).toBe(true);
    expect(isShadowingRepeats(4)).toBe(false);
  });
});
