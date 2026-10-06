import { describe, expect, it } from "vitest";
import { formatAdminDate, formatAdminDateTime, formatRelative } from "./format";

describe("formatAdminDate", () => {
  it("prints the UTC day", () => {
    expect(formatAdminDate("2026-09-29T23:30:00Z")).toBe("2026-09-29");
    expect(formatAdminDate("2026-09-29T23:30:00-05:00")).toBe("2026-09-30");
  });

  it("shows a dash for missing or invalid dates", () => {
    expect(formatAdminDate(null)).toBe("—");
    expect(formatAdminDate(undefined)).toBe("—");
    expect(formatAdminDate("not a date")).toBe("—");
  });
});

describe("formatAdminDateTime", () => {
  it("prints the UTC date and time", () => {
    expect(formatAdminDateTime("2026-09-29T23:30:45Z")).toBe("2026-09-29 23:30 UTC");
    expect(formatAdminDateTime("2026-09-29T23:30:00-05:00")).toBe("2026-09-30 04:30 UTC");
  });

  it("shows a dash for missing or invalid input", () => {
    expect(formatAdminDateTime(null)).toBe("—");
    expect(formatAdminDateTime("nope")).toBe("—");
  });
});

describe("formatRelative", () => {
  const from = new Date("2026-10-06T12:00:00Z");
  const at = (ms: number) => new Date(from.getTime() + ms);
  const MIN = 60_000;

  it("counts forward and back to the two largest units", () => {
    expect(formatRelative(at(3 * 24 * 60 * MIN + 2 * 60 * MIN + 5 * MIN), from)).toBe("in 3d 2h");
    expect(formatRelative(at(-5 * MIN), from)).toBe("5m ago");
    expect(formatRelative(at(90 * MIN), from)).toBe("in 1h 30m");
  });

  it("says under a minute for a tiny gap, with its direction", () => {
    expect(formatRelative(at(20_000), from)).toBe("in under 1m");
    expect(formatRelative(at(-20_000), from)).toBe("under 1m ago");
  });
});
