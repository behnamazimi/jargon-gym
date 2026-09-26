import { describe, expect, it } from "vitest";
import { formatPlaybackTime, voteFeedback } from "./feedback";

describe("voteFeedback", () => {
  it("explains each vote", () => {
    expect(voteFeedback(1)).toMatch(/more stories/);
    expect(voteFeedback(-1)).toMatch(/fewer stories/);
    expect(voteFeedback(null)).toBe("Vote removed.");
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
