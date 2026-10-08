import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildNarrationScript } from "@/lib/narration/template";
import { createMurfProvider } from "@/lib/ai/speech/providers/murf";
import { COLLECTION_LANGUAGES, COLLECTION_LANGUAGE_OPTIONS, parseLanguage } from "./languages";
import { TERM_LABELS } from "./term-labels";

const NEW_LANGUAGES = ["es", "fr", "de", "it", "pt", "ru", "tr", "ja", "ko", "zh"] as const;

describe("supported languages", () => {
  it("offers twelve languages with unique names, English first", () => {
    expect(COLLECTION_LANGUAGES).toHaveLength(12);
    expect(COLLECTION_LANGUAGE_OPTIONS).toHaveLength(12);
    expect(COLLECTION_LANGUAGE_OPTIONS[0]).toEqual({ value: "en", label: "English" });
    expect(new Set(COLLECTION_LANGUAGE_OPTIONS.map((option) => option.label)).size).toBe(12);
    expect(COLLECTION_LANGUAGE_OPTIONS.map((option) => option.value).sort()).toEqual(
      [...COLLECTION_LANGUAGES].sort(),
    );
  });

  it("falls back to English for an unknown code", () => {
    expect(parseLanguage("ja")).toBe("ja");
    expect(parseLanguage("xx")).toBe("en");
    expect(parseLanguage(null)).toBe("en");
  });

  it("matches the database list in the migration", () => {
    const sql = readFileSync(
      join(__dirname, "../../supabase/migrations/20261020100000_more_languages.sql"),
      "utf8",
    );
    const list = /select p_language in \(([^)]+)\)/.exec(sql)?.[1] ?? "";
    const codes = list.split(",").map((code) => code.trim().replaceAll("'", ""));
    expect(codes.sort()).toEqual([...COLLECTION_LANGUAGES].sort());
  });

  it.each(NEW_LANGUAGES)("has complete card labels for %s", (language) => {
    const labels = TERM_LABELS[language];
    for (const [key, value] of Object.entries(labels)) {
      if (typeof value === "string") expect(value.trim(), key).not.toBe("");
    }
    expect(labels.searchOnGoogle("term")).toContain("term");
    expect(labels.example).not.toBe(TERM_LABELS.en.example);
  });

  it.each(NEW_LANGUAGES)("speaks %s with connector phrases in full narration", (language) => {
    const script = buildNarrationScript(
      {
        term: "t",
        definition: "d",
        mental_model: "m",
        example: "e",
        anti_example: null,
        discussion: null,
        controversy: null,
      },
      language,
      "full",
    );
    expect(script).not.toContain("For example,");
    expect(script).not.toContain("Think of it like this:");
  });

  it("has a Murf voice for every new language except Russian and Turkish", () => {
    const murf = createMurfProvider("falcon-2");
    for (const language of NEW_LANGUAGES) {
      expect(murf.supports?.(language), language).toBe(language !== "ru" && language !== "tr");
    }
    expect(murf.supports?.("en")).toBe(true);
    expect(murf.supports?.("nl")).toBe(true);
  });
});
