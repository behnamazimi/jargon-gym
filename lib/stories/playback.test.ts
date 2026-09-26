import { describe, expect, it } from "vitest";
import { formatPlaybackTime, nextPlaybackSpeed, parsePlaybackSpeed } from "./playback";

describe("nextPlaybackSpeed", () => {
  it("steps through the speeds and wraps around", () => {
    expect(nextPlaybackSpeed(1)).toBe(1.25);
    expect(nextPlaybackSpeed(1.25)).toBe(1.5);
    expect(nextPlaybackSpeed(1.5)).toBe(0.75);
    expect(nextPlaybackSpeed(0.75)).toBe(1);
  });

  it("starts over from an unknown speed", () => {
    expect(nextPlaybackSpeed(2)).toBe(1);
  });
});

describe("parsePlaybackSpeed", () => {
  it("keeps a speed we offer", () => {
    expect(parsePlaybackSpeed("1.5")).toBe(1.5);
    expect(parsePlaybackSpeed("0.75")).toBe(0.75);
  });

  it("falls back to normal speed for anything else", () => {
    for (const stored of [null, "", "2", "fast", "NaN"]) {
      expect(parsePlaybackSpeed(stored)).toBe(1);
    }
  });
});

describe("formatPlaybackTime", () => {
  it("formats minutes and padded seconds", () => {
    expect(formatPlaybackTime(0)).toBe("0:00");
    expect(formatPlaybackTime(9.9)).toBe("0:09");
    expect(formatPlaybackTime(72)).toBe("1:12");
  });

  it("shows 0:00 before the length is known", () => {
    expect(formatPlaybackTime(Number.NaN)).toBe("0:00");
    expect(formatPlaybackTime(Number.POSITIVE_INFINITY)).toBe("0:00");
    expect(formatPlaybackTime(-3)).toBe("0:00");
  });
});
