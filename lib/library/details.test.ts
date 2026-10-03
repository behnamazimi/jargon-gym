import { describe, expect, it } from "vitest";
import { parseDetailIds } from "./details";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("parseDetailIds", () => {
  it("reads a comma-separated list of term ids, without repeats", () => {
    expect(parseDetailIds(`${id(1)},${id(2)},${id(1)}`)).toEqual([id(1), id(2)]);
  });

  it("rejects a missing value, a non-uuid, or more than 50 ids", () => {
    expect(parseDetailIds(null)).toBeNull();
    expect(parseDetailIds(`${id(1)},nope`)).toBeNull();
    const many = Array.from({ length: 51 }, (_, i) => id(i)).join(",");
    expect(parseDetailIds(many)).toBeNull();
  });
});
