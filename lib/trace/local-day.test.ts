import { describe, expect, it } from "vitest";
import { isSameLocalDay, STUDY_TIMEZONE, studyTimezone } from "./local-day";

describe("studyTimezone", () => {
  it("uses the saved timezone", () => {
    expect(studyTimezone("America/New_York")).toBe("America/New_York");
  });

  it("falls back when none is saved or the runtime doesn't know it", () => {
    expect(studyTimezone(null)).toBe(STUDY_TIMEZONE);
    expect(studyTimezone("")).toBe(STUDY_TIMEZONE);
    expect(studyTimezone("Not/A_Zone")).toBe(STUDY_TIMEZONE);
  });
});

describe("isSameLocalDay", () => {
  // 19:00 and 09:00 the next morning in New York; 01:00 and 15:00 in Amsterdam.
  const evening = new Date("2026-03-02T00:00:00Z");
  const nextMorning = new Date("2026-03-02T14:00:00Z");
  // 08:00 and 23:00 the same day in New York; 14:00 and 05:00 the next day in Amsterdam.
  const morning = new Date("2026-03-02T13:00:00Z");
  const night = new Date("2026-03-03T04:00:00Z");

  it("splits days at the person's own midnight", () => {
    expect(isSameLocalDay(evening, nextMorning, "America/New_York")).toBe(false);
    expect(isSameLocalDay(morning, night, "America/New_York")).toBe(true);
  });

  it("would get both wrong with Amsterdam's midnight", () => {
    expect(isSameLocalDay(evening, nextMorning, STUDY_TIMEZONE)).toBe(true);
    expect(isSameLocalDay(morning, night, STUDY_TIMEZONE)).toBe(false);
  });
});
