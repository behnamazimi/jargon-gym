import { describe, expect, it } from "vitest";
import { EMPTY_SHIELD, streakSummary, withTodayDone } from "./status";

// 23:30 on 10 March in Amsterdam, already 11 March in Tokyo.
const now = new Date("2026-03-10T22:30:00Z");

function row(
  lastActiveDate: string | null,
  timezone: string | null = "Europe/Amsterdam",
  shield: { ready?: boolean; progress?: number; savedDate?: string; pending?: boolean } = {},
) {
  return {
    current_streak: 5,
    longest_streak: 9,
    last_active_date: lastActiveDate,
    timezone,
    shield_ready: shield.ready ?? false,
    shield_progress: shield.progress ?? 0,
    shield_saved_date: shield.savedDate ?? null,
    shield_notice_pending: shield.pending ?? false,
  };
}

describe("streakSummary", () => {
  it("keeps the streak and marks today done when active today", () => {
    expect(streakSummary(row("2026-03-10"), now)).toEqual({
      current: 5,
      longest: 9,
      doneToday: true,
      shield: EMPTY_SHIELD,
    });
  });

  it("keeps the streak but leaves today open when last active yesterday", () => {
    expect(streakSummary(row("2026-03-09"), now)).toEqual({
      current: 5,
      longest: 9,
      doneToday: false,
      shield: EMPTY_SHIELD,
    });
  });

  it("shows 0 once a whole day was missed", () => {
    expect(streakSummary(row("2026-03-08"), now).current).toBe(0);
    expect(streakSummary(row(null), now).current).toBe(0);
  });

  it("keeps the streak alive across one missed day when a shield is banked", () => {
    expect(
      streakSummary(row("2026-03-08", "Europe/Amsterdam", { ready: true }), now),
    ).toMatchObject({
      current: 5,
      doneToday: false,
      shield: { ready: true, inUse: true },
    });
  });

  it("does not cover two missed days", () => {
    const summary = streakSummary(row("2026-03-07", "Europe/Amsterdam", { ready: true }), now);
    expect(summary.current).toBe(0);
    expect(summary.shield).toEqual(EMPTY_SHIELD);
  });

  it("reports a shield message only while it is pending", () => {
    const saved = { savedDate: "2026-03-08" };
    expect(
      streakSummary(row("2026-03-10", "Europe/Amsterdam", { ...saved, pending: true }), now).shield
        .noticeDate,
    ).toBe("2026-03-08");
    expect(streakSummary(row("2026-03-10", "Europe/Amsterdam", saved), now).shield.noticeDate).toBe(
      null,
    );
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
    expect(
      withTodayDone({ current: 9, longest: 9, doneToday: false, shield: EMPTY_SHIELD }),
    ).toEqual({
      current: 10,
      longest: 10,
      doneToday: true,
      shield: { ...EMPTY_SHIELD, progress: 1 },
    });
  });

  it("starts a new streak at 1", () => {
    expect(
      withTodayDone({ current: 0, longest: 4, doneToday: false, shield: EMPTY_SHIELD }),
    ).toEqual({
      current: 1,
      longest: 4,
      doneToday: true,
      shield: { ...EMPTY_SHIELD, progress: 1 },
    });
  });

  it("leaves a streak already done today alone", () => {
    const done = { current: 3, longest: 4, doneToday: true, shield: EMPTY_SHIELD };
    expect(withTodayDone(done)).toBe(done);
  });

  it("spends the shield that was covering yesterday and restarts the count", () => {
    const covering = { ...EMPTY_SHIELD, ready: true, inUse: true };
    expect(withTodayDone({ current: 9, longest: 9, doneToday: false, shield: covering })).toEqual({
      current: 10,
      longest: 10,
      doneToday: true,
      shield: { ready: false, progress: 1, inUse: false, noticeDate: null },
    });
  });

  it("earns the shield on the seventh active day", () => {
    const sixth = { ...EMPTY_SHIELD, progress: 6 };
    expect(
      withTodayDone({ current: 6, longest: 6, doneToday: false, shield: sixth }).shield,
    ).toMatchObject({ ready: true, progress: 0 });
  });
});
