import type { DistractorSource, DistractorTerm } from "./distractors";
import type { QuizTerm } from "./types";

export function makeTerm(overrides: Partial<QuizTerm> = {}): QuizTerm {
  return {
    id: "term-default",
    term: "Default Term",
    definition: "A default definition.",
    example: null,
    antiExample: null,
    category: null,
    kind: "terms",
    language: "en",
    domainId: "domain-1",
    domainName: "Testing",
    ...overrides,
  };
}

export function makeDistractor(overrides: Partial<DistractorTerm> = {}): DistractorTerm {
  return {
    id: "d-default",
    term: "Other",
    definition: "Something else entirely.",
    category: null,
    ...overrides,
  };
}

export function sourceOf(
  distractors: DistractorTerm[],
  sameDefinition: DistractorTerm[] = [],
): DistractorSource {
  return {
    pick: async (_term, count) => distractors.slice(0, count),
    sameDefinition: async () => sameDefinition,
  };
}

/** A deterministic rng cycling through the given values. */
export function rngOf(...values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}
