import { describe, expect, it } from "vitest";
import { isBanned } from "./suspension";

const now = new Date("2026-09-30T12:00:00Z");

describe("isBanned", () => {
  it("is true while the ban runs", () => {
    expect(isBanned({ banned_until: "2126-09-30T00:00:00Z" }, now)).toBe(true);
  });

  it("is false with no ban, or once it has ended", () => {
    expect(isBanned({}, now)).toBe(false);
    expect(isBanned({ banned_until: null }, now)).toBe(false);
    expect(isBanned({ banned_until: "2026-09-30T11:59:59Z" }, now)).toBe(false);
  });
});
