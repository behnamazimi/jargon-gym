import { describe, expect, it } from "vitest";
import { TOUR_CHAPTERS } from "@/lib/tour/chapters";
import { PROMOS, USAGE_CAP, isPromoId, isVisitKey, visitKey } from "./promos";
import {
  NEW_USER_PROMO_STATE,
  accountAgeDays,
  eligiblePromos,
  hasVisitedTarget,
  pickPromo,
  type PromoState,
} from "./state";

const NOW = new Date("2026-10-10T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

const ready: PromoState = { ...NEW_USER_PROMO_STATE, tourDone: true };
const busy = { reviews: USAGE_CAP, reads: USAGE_CAP, accountAgeDays: 30 };

function ids(promos: readonly { id: string }[]) {
  return promos.map((promo) => promo.id);
}

describe("PROMOS", () => {
  it("has unique ids and one visit key per target", () => {
    expect(new Set(ids(PROMOS)).size).toBe(PROMOS.length);
    expect(new Set(PROMOS.map((promo) => promo.target)).size).toBe(PROMOS.length);
  });

  it("points at real tour chapters", () => {
    for (const promo of PROMOS) {
      if ("tourChapter" in promo) {
        expect(TOUR_CHAPTERS.map((chapter) => chapter.id)).toContain(promo.tourChapter);
      }
    }
  });

  it("recognises its own ids and visit keys only", () => {
    expect(isPromoId("quiz")).toBe(true);
    expect(isPromoId("nope")).toBe(false);
    expect(isVisitKey(visitKey("quiz"))).toBe(true);
    expect(isVisitKey("quiz")).toBe(false);
  });
});

describe("eligiblePromos", () => {
  it("shows nothing until the tour is done", () => {
    expect(eligiblePromos("review", NEW_USER_PROMO_STATE, NOW)).toEqual([]);
  });

  it("only returns promos listed for the route", () => {
    expect(ids(eligiblePromos("review", ready, NOW))).toEqual(["quiz", "mastery"]);
    expect(ids(eligiblePromos("read", ready, NOW))).toEqual(["quiz", "stories"]);
  });

  it("skips pages already visited, by key or by tour chapter", () => {
    const visited = { ...ready, seen: [visitKey("quiz")], tourSeen: ["stories"] };
    expect(ids(eligiblePromos("read", visited, NOW))).toEqual([]);
  });

  it("skips a promo while snoozed and brings it back after", () => {
    const dismissedAt = (daysAgo: number) =>
      new Date(NOW.getTime() - daysAgo * DAY_MS).toISOString();
    const snoozed = { ...ready, dismissed: { mastery: dismissedAt(3) } };
    expect(ids(eligiblePromos("review", snoozed, NOW))).toEqual(["quiz"]);
    const expired = { ...ready, dismissed: { mastery: dismissedAt(15) } };
    expect(ids(eligiblePromos("review", expired, NOW))).toEqual(["quiz", "mastery"]);
  });

  it("ignores an unreadable dismissed time", () => {
    const state = { ...ready, dismissed: { mastery: "not a date" } };
    expect(ids(eligiblePromos("review", state, NOW))).toContain("mastery");
  });
});

describe("pickPromo", () => {
  const candidates = eligiblePromos("library", ready, NOW);

  it("picks the highest priority promo whose condition holds", () => {
    expect(pickPromo(candidates, busy)?.id).toBe("triage");
  });

  it("falls back to a lower priority promo", () => {
    const seen = { ...ready, seen: [visitKey("triage")] };
    const withoutTriage = eligiblePromos("library", seen, NOW);
    expect(pickPromo(withoutTriage, busy)?.id).toBe("browse");
    expect(pickPromo(candidates, { reviews: 0, reads: 0, accountAgeDays: 2 })?.id).toBe("browse");
  });

  it("shows Mastery last", () => {
    const seen = { ...ready, seen: [visitKey("triage"), visitKey("browse")] };
    expect(pickPromo(eligiblePromos("library", seen, NOW), busy)?.id).toBe("mastery");
  });

  it("returns null when no condition holds", () => {
    expect(pickPromo(candidates, { reviews: 0, reads: 0, accountAgeDays: 0 })).toBeNull();
  });
});

describe("hasVisitedTarget", () => {
  it("is false for an unseen page and true once recorded", () => {
    expect(hasVisitedTarget(ready, "mastery")).toBe(false);
    expect(hasVisitedTarget({ ...ready, seen: [visitKey("mastery")] }, "mastery")).toBe(true);
  });
});

describe("accountAgeDays", () => {
  it("counts whole days and treats a missing date as new", () => {
    const created = new Date(NOW.getTime() - 2.5 * DAY_MS).toISOString();
    expect(accountAgeDays({ ...ready, createdAt: created }, NOW)).toBe(2);
    expect(accountAgeDays(ready, NOW)).toBe(0);
  });
});
