import { describe, expect, it } from "vitest";
import { assessTable, formatBytes } from "./db-health";

describe("assessTable", () => {
  it("leaves a small table alone", () => {
    expect(assessTable({ name: "review_events", rows: 2_400, bytes: 900_000 })).toMatchObject({
      watch: false,
      reason: null,
    });
  });

  it("flags review_events at two million rows", () => {
    expect(assessTable({ name: "review_events", rows: 2_000_000, bytes: 400 * 1024 ** 2 })).toEqual(
      expect.objectContaining({ watch: true, reason: "over 2,000,000 rows" }),
    );
  });

  it("flags a table that is big in bytes but not in rows", () => {
    expect(assessTable({ name: "stories", rows: 1_000, bytes: 2 * 1024 ** 3 })).toEqual(
      expect.objectContaining({ watch: true, reason: "over 1.0 GB" }),
    );
  });

  it("never flags a table it has no limit for", () => {
    expect(assessTable({ name: "unknown", rows: 99_000_000, bytes: 9 * 1024 ** 3 }).watch).toBe(
      false,
    );
  });
});

describe("formatBytes", () => {
  it("picks a readable unit", () => {
    expect(formatBytes(300)).toBe("1 kB");
    expect(formatBytes(1536 * 1024)).toBe("1.5 MB");
    expect(formatBytes(3 * 1024 ** 3)).toBe("3.0 GB");
  });
});
