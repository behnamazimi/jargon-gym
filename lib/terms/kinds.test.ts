import { describe, expect, it } from "vitest";
import { parseKind } from "./kinds";

describe("parseKind", () => {
  it("keeps the two known kinds", () => {
    expect(parseKind("terms")).toBe("terms");
    expect(parseKind("vocabulary")).toBe("vocabulary");
  });

  it("falls back to terms for anything else", () => {
    expect(parseKind("slang")).toBe("terms");
    expect(parseKind("")).toBe("terms");
    expect(parseKind(null)).toBe("terms");
    expect(parseKind(undefined)).toBe("terms");
  });
});
