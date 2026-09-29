import { describe, expect, it } from "vitest";
import { exactEmailPattern } from "./email-lookup";

describe("exactEmailPattern", () => {
  it("leaves an ordinary address alone", () => {
    expect(exactEmailPattern("  Ada@Example.com ")).toBe("Ada@Example.com");
  });

  it("escapes pattern characters so they only match themselves", () => {
    expect(exactEmailPattern("first_last@example.com")).toBe("first\\_last@example.com");
    expect(exactEmailPattern("%@example.com")).toBe("\\%@example.com");
    expect(exactEmailPattern("a\\b@example.com")).toBe("a\\\\b@example.com");
  });
});
