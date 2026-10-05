import { describe, expect, it } from "vitest";
import { AI_DEFINITION_MAX_CHARS } from "./mix";
import { buildQuizPrompt } from "./generate-prompt";
import type { AiSlot } from "./plan-ai";
import { templateById } from "./templates/registry";
import { makeTerm } from "./test-support";
import type { PlannedTemplateId } from "./types";

function slot(id: string, template: PlannedTemplateId, overrides = {}): AiSlot {
  return {
    term: makeTerm({ id, term: `Term ${id}`, ...overrides }),
    template: templateById(template)!,
  };
}

describe("buildQuizPrompt", () => {
  it("sends each term's id, template, name and definition", () => {
    const prompt = buildQuizPrompt([slot("a", "masked_example", { definition: "Does a thing." })]);
    expect(prompt).toContain("- id: a");
    expect(prompt).toContain("  template: masked_example");
    expect(prompt).toContain('  term: "Term a"');
    expect(prompt).toContain('  definition: "Does a thing."');
  });

  it("includes guidance and shapes only for the templates in the quiz", () => {
    const prompt = buildQuizPrompt([slot("a", "term_to_meaning")]);
    expect(prompt).toContain("- term_to_meaning:");
    expect(prompt).not.toContain("- masked_example");
    expect(prompt).not.toContain("- does_it_fit");
    expect(prompt).not.toContain("true_false");
    expect(prompt).not.toContain('"quote"');
  });

  it("shows the boolean shape and quote only when a template needs them", () => {
    const prompt = buildQuizPrompt([slot("a", "does_it_fit")]);
    expect(prompt).toContain("true_false");
    expect(prompt).toContain('"quote": "string"');
    expect(prompt).not.toContain("multiple_choice");
  });

  it("caps a long definition", () => {
    const long = "word ".repeat(200);
    const prompt = buildQuizPrompt([slot("a", "definition_to_term", { definition: long })]);
    expect(prompt).not.toContain(long.trim());
    expect(prompt).toContain("…");
    const line = prompt.split("\n").find((l) => l.startsWith("  definition:"))!;
    expect(line.length).toBeLessThanOrEqual(AI_DEFINITION_MAX_CHARS + 20);
  });

  it("adds the collection only when the quiz spans several", () => {
    const one = buildQuizPrompt([slot("a", "term_to_meaning"), slot("b", "term_to_meaning")]);
    expect(one).not.toContain("  domain:");
    const two = buildQuizPrompt([
      slot("a", "term_to_meaning"),
      slot("b", "term_to_meaning", { domainName: "Other" }),
    ]);
    expect(two).toContain('  domain: "Other"');
  });

  it("gives each kind its own intro and labels guidance when kinds are mixed", () => {
    const terms = buildQuizPrompt([slot("a", "masked_example")]);
    expect(terms).toContain("Field terms:");
    expect(terms).not.toContain("Language words and phrases:");

    const mixed = buildQuizPrompt([
      slot("a", "masked_example"),
      slot("b", "masked_example", { kind: "vocabulary" }),
    ]);
    expect(mixed).toContain("Field terms:");
    expect(mixed).toContain("Language words and phrases:");
    expect(mixed).toContain("- masked_example (field terms):");
    expect(mixed).toContain("- masked_example (language words):");
  });

  it("stays well under a token budget for a full quiz of every template", () => {
    const ids: PlannedTemplateId[] = [
      "definition_to_term",
      "term_to_meaning",
      "masked_example",
      "does_it_fit",
    ];
    const slots = Array.from({ length: 20 }, (_, i) =>
      slot(`id-${i}`, ids[i % ids.length], {
        definition: "A typical definition of about ninety characters, give or take.",
      }),
    );
    // Roughly four characters per token.
    expect(buildQuizPrompt(slots).length / 4).toBeLessThan(2000);
  });
});
