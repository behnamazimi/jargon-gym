import { describe, expect, it } from "vitest";
import { formatAdminDate } from "./format";

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
