import { describe, expect, it } from "vitest";
import { MAX_IMPORT_TERMS } from "./commit-schema";
import {
  MAX_INPUT_CHARS,
  NO_TERMS_MESSAGE,
  overLimitMessage,
  readImportInput,
  TOO_MUCH_TEXT_MESSAGE,
} from "./read-input";

describe("readImportInput", () => {
  it("says so when there is nothing", () => {
    const result = readImportInput("  ", {});
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.problem.message).toBe("Nothing to check yet. Paste a list or choose a file.");
  });

  it("reads a plain list", () => {
    const result = readImportInput("API – a way\nCache – copy", {});
    expect(result.ok && result.kind === "list" && result.built.terms).toHaveLength(2);
  });

  it("reads JSON", () => {
    const result = readImportInput('{"domain":"X","terms":[{"term":"A"}]}', {});
    expect(result.ok && result.kind).toBe("json");
  });

  it("offers to treat broken JSON as a list, and then does", () => {
    const broken = '{ "API": a way';
    const first = readImportInput(broken, {});
    expect(!first.ok && first.problem.canTreatAsText).toBe(true);
    const second = readImportInput(broken, { treatAsText: true });
    expect(second.ok).toBe(true);
  });

  it("reports a header-only paste as no terms", () => {
    const result = readImportInput("Term\tDefinition", {});
    expect(!result.ok && result.problem.message).toBe(NO_TERMS_MESSAGE);
  });

  it("never truncates a list that is too long", () => {
    const text = Array.from({ length: MAX_IMPORT_TERMS + 1 }, (_, i) => `t${i} – d${i}`).join("\n");
    const result = readImportInput(text, {});
    expect(!result.ok && result.problem.message).toBe(overLimitMessage(MAX_IMPORT_TERMS + 1));
  });

  it("accepts exactly the cap", () => {
    const text = Array.from({ length: MAX_IMPORT_TERMS }, (_, i) => `t${i} – d${i}`).join("\n");
    expect(readImportInput(text, {}).ok).toBe(true);
  });

  it("refuses text that is far too long, without parsing it", () => {
    const result = readImportInput("a – b\n".repeat(MAX_INPUT_CHARS / 6 + 10), {});
    expect(!result.ok && result.problem.message).toBe(TOO_MUCH_TEXT_MESSAGE);
  });

  it("drops control and direction-override characters from what it reads", () => {
    const result = readImportInput("AP\u0000I – a\u202E way", {});
    expect(result.ok && result.built.terms.map((t) => [t.term, t.definition])).toEqual([
      ["API", "a way"],
    ]);
  });
});
