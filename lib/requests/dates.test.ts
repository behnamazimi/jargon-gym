import { describe, expect, it } from "vitest";
import { formatRequestDate } from "./dates";

describe("formatRequestDate", () => {
  const cases: [string, string, string | null, string][] = [
    ["UTC afternoon", "2026-10-03T14:00:00Z", "UTC", "Sat 3 Oct"],
    [
      "a zone ahead of UTC crosses midnight",
      "2026-10-03T23:30:00Z",
      "Europe/Amsterdam",
      "Sun 4 Oct",
    ],
    [
      "a zone behind UTC stays the day before",
      "2026-10-04T02:00:00Z",
      "America/Los_Angeles",
      "Sat 3 Oct",
    ],
    ["no zone falls back to UTC", "2026-10-03T23:30:00Z", null, "Sat 3 Oct"],
    ["an unknown zone falls back to UTC", "2026-10-03T23:30:00Z", "Not/AZone", "Sat 3 Oct"],
    [
      "the day after daylight saving ends",
      "2026-10-25T00:30:00Z",
      "Europe/Amsterdam",
      "Sun 25 Oct",
    ],
  ];

  it.each(cases)("%s", (_name, iso, zone, expected) => {
    expect(formatRequestDate(iso, zone)).toBe(expected);
  });
});
