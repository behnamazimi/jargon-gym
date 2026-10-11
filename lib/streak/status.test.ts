import { describe, expect, it } from "vitest";
import { streakSummary, withTodayDone } from "./status";

// 23:30 on 10 March in Amsterdam, already 11 March in Tokyo.
const now = new Date("2026-03-10T22:30:00Z");

function row(lastActiveDate: string | null, timezone: string | null = "Europe/Amsterdam") {
  return { current_streak: 5, longest_streak: 9, last_active_date: lastActiveDate, timezone };
}

describe("streakSummary", () => {
  it("keeps the streak and marks today done when active today", () => {
    expect(streakSummary(row("2026-03-10"), now)).toEqual({
      current: 5,
      longest: 9,
      doneToday: true,
    });
  });

  it("keeps the streak but leaves today open when last active yesterday", () => {
    expect(streakSummary(row("2026-03-09"), now)).toEqual({
      current: 5,
      longest: 9,
      doneToday: false,
    });
  });

  it("shows 0 once a whole day was missed", () => {
    expect(streakSummary(row("2026-03-08"), now).current).toBe(0);
    expect(streakSummary(row(null), now).current).toBe(0);
  });

  it("uses the person's timezone for the day boundary", () => {
    expect(streakSummary(row("2026-03-10", "Asia/Tokyo"), now)).toMatchObject({
      current: 5,
      doneToday: false,
    });
    expect(streakSummary(row("2026-03-09", "Asia/Tokyo"), now).current).toBe(0);
  });

  it("crosses month boundaries", () => {
    const firstOfMonth = new Date("2026-03-01T12:00:00Z");
    expect(streakSummary(row("2026-02-28"), firstOfMonth).current).toBe(5);
  });
});

describe("withTodayDone", () => {
  it("adds today to a streak that was waiting on it", () => {
    expect(withTodayDone({ current: 9, longest: 9, doneToday: false })).toEqual({
      current: 10,
      longest: 10,
      doneToday: true,
    });
  });

  it("starts a new streak at 1", () => {
    expect(withTodayDone({ current: 0, longest: 4, doneToday: false })).toEqual({
      current: 1,
      longest: 4,
      doneToday: true,
    });
  });

  it("leaves a streak already done today alone", () => {
    const done = { current: 3, longest: 4, doneToday: true };
    expect(withTodayDone(done)).toBe(done);
  });
});
