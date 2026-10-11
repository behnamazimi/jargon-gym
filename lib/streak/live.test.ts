import { describe, expect, it } from "vitest";
import { liveStreak } from "./live";

describe("liveStreak", () => {
  // 09:00 on 2026-03-10 in New York, 14:00 in Amsterdam.
  const now = new Date("2026-03-10T13:00:00Z");

  it("keeps the streak when the last active day is today or yesterday", () => {
    expect(liveStreak(4, "2026-03-10", "America/New_York", now)).toBe(4);
    expect(liveStreak(4, "2026-03-09", "America/New_York", now)).toBe(4);
  });

  it("drops to 0 after a whole day with no activity", () => {
    expect(liveStreak(4, "2026-03-08", "America/New_York", now)).toBe(0);
  });

  it("is 0 with no activity at all", () => {
    expect(liveStreak(0, null, null, now)).toBe(0);
  });

  it("uses the person's own midnight", () => {
    // 23:30 on 2026-03-10 in New York, already 2026-03-11 in Amsterdam.
    const lateEvening = new Date("2026-03-11T03:30:00Z");
    expect(liveStreak(4, "2026-03-09", "America/New_York", lateEvening)).toBe(4);
    expect(liveStreak(4, "2026-03-09", null, lateEvening)).toBe(0);
  });

  it("handles the first of the month", () => {
    expect(liveStreak(2, "2026-02-28", "UTC", new Date("2026-03-01T12:00:00Z"))).toBe(2);
  });
});
