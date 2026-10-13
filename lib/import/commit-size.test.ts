import { describe, expect, it } from "vitest";
import { tooBigFailure } from "./commit-errors";
import { commitBytes, formatMegabytes, MAX_COMMIT_BYTES } from "./commit-size";

describe("commitBytes", () => {
  it("counts encoded bytes, not characters", () => {
    expect(commitBytes({ t: "é" })).toBe(JSON.stringify({ t: "x" }).length + 1);
  });

  it("puts 1100 long terms over the limit", () => {
    const terms = Array.from({ length: 1100 }, (_, i) => ({
      term: `t${i}`,
      definition: "d".repeat(4000),
    }));
    expect(commitBytes({ terms, links: [] })).toBeGreaterThan(MAX_COMMIT_BYTES);
  });
});

describe("tooBigFailure", () => {
  it("names the size and the limit", () => {
    expect(tooBigFailure(3.4 * 1024 * 1024).message).toMatch(/3\.4 MB.*3\.0 MB/);
    expect(formatMegabytes(MAX_COMMIT_BYTES)).toBe("3.0 MB");
  });
});
