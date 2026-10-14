import { describe, expect, it } from "vitest";
import { parseNewCollectionInput } from "./collection-schema";

describe("parseNewCollectionInput", () => {
  it.each([
    [
      { name: "Startup finance", language: "nl", kind: "vocabulary" },
      { ok: true, name: "Startup finance", language: "nl", kind: "vocabulary" },
    ],
    [
      { name: "  Padded  ", language: "en", kind: "terms" },
      { ok: true, name: "Padded", language: "en", kind: "terms" },
    ],
    [
      { name: "x", language: undefined, kind: "terms" },
      { ok: true, name: "x", language: "en", kind: "terms" },
    ],
    [
      { name: "a".repeat(100), language: "en", kind: "terms" },
      { ok: true, name: "a".repeat(100), language: "en", kind: "terms" },
    ],
  ])("accepts %j", (input, expected) => {
    const result = parseNewCollectionInput(input);
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.data).toEqual({
        name: expected.name,
        language: expected.language,
        kind: expected.kind,
      });
  });

  it.each([
    [{ name: "", language: "en", kind: "terms" }, "Enter a name for your collection."],
    [{ name: "   ", language: "en", kind: "terms" }, "Enter a name for your collection."],
    [
      { name: "a".repeat(101), language: "en", kind: "terms" },
      "Keep the name under 100 characters.",
    ],
  ])("rejects %j", (input, message) => {
    expect(parseNewCollectionInput(input)).toEqual({ ok: false, error: message });
  });

  it("requires a kind", () => {
    expect(parseNewCollectionInput({ name: "X", language: "en" })).toEqual({
      ok: false,
      error: "Choose what this collection teaches.",
    });
  });

  it("rejects an unsupported language", () => {
    expect(parseNewCollectionInput({ name: "X", language: "xx", kind: "terms" }).ok).toBe(false);
  });

  it("cleans control and override characters from the name", () => {
    const result = parseNewCollectionInput({
      name: " Fi\u0000ne\u202E ",
      language: "en",
      kind: "terms",
    });
    expect(result.ok && result.data.name).toBe("Fine");
  });
});
