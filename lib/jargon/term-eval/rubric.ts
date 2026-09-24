export const TERM_FIELDS = [
  "term",
  "category",
  "definition",
  "example",
  "mental_model",
  "discussion",
  "anti_example",
  "controversy",
] as const;

export type TermField = (typeof TERM_FIELDS)[number];

export type EvalTerm = {
  domainName: string;
  term: string;
  category: string;
  definition: string;
  example: string | null;
  mentalModel: string | null;
  discussion: string | null;
  antiExample: string | null;
  controversy: string | null;
};

const FIELD_PROP: Record<TermField, keyof Omit<EvalTerm, "domainName">> = {
  term: "term",
  category: "category",
  definition: "definition",
  example: "example",
  mental_model: "mentalModel",
  discussion: "discussion",
  anti_example: "antiExample",
  controversy: "controversy",
};

type FieldContract = {
  required: boolean;
  job: string;
};

export const FIELD_CONTRACT: Record<TermField, FieldContract> = {
  term: { required: true, job: "The headword a reader looks up." },
  category: {
    required: true,
    job: "A short browse label for filtering, not a learning field.",
  },
  definition: {
    required: true,
    job: "What the term means, and only that. No usage, debate, contrast, or analogy.",
  },
  example: {
    required: false,
    job: "A concrete scene or a natural sentence showing the term in use.",
  },
  mental_model: {
    required: false,
    job: "A comparison or analogy that makes the term click.",
  },
  discussion: {
    required: false,
    job: "Practice nuance: a tradeoff, convention, or common misuse.",
  },
  anti_example: {
    required: false,
    job: "A near-miss people confuse with this term, and why it is not the term.",
  },
  controversy: {
    required: false,
    job: "A real disagreement among practitioners about meaning or scope.",
  },
};

export const FIT_LEVELS: Record<TermField, [string, string, string]> = {
  term: [
    "A sentence or explanation, not a name someone would look up.",
    "A name, but an abbreviation, synonym, or phrase rather than the headword.",
    "The headword a reader would look up for this entry.",
  ],
  category: [
    "A definition, example, or sentence rather than a browse label.",
    "Label-like, but long, vague, or just a repeat of the term name.",
    "A short browse label that would group this term with similar ones.",
  ],
  definition: [
    "Does not say what the term is. It is usage advice, a debate, a contrast, an analogy, or filler.",
    "Partly says what the term is, but also carries usage, debate, contrast, or analogy.",
    "Says what the term is, in plain language, and stays on meaning.",
  ],
  example: [
    "Not a concrete scene and not a natural sentence using the term. It restates the definition or stays abstract.",
    "Gestures at a situation, but a reader still could not picture the use or hear the word in speech.",
    "One concrete scene or one natural sentence that shows the term in use.",
  ],
  mental_model: [
    "Not a comparison or analogy. It restates the definition in other words.",
    "Offers a comparison, but it is vague or no easier to grasp than the definition.",
    "A memorable comparison that makes the term click faster than the definition alone.",
  ],
  discussion: [
    "Restates the definition, or filler with no practice implication.",
    "Mentions practice, but the tradeoff, convention, or misuse stays vague.",
    "A tradeoff, convention, or common misuse that is not already obvious from the definition.",
  ],
  anti_example: [
    "Does not name a near-miss. It is another true example of the term, or unrelated.",
    "Names something nearby, but the boundary with the term stays unclear.",
    "Names something people commonly mistake for this term, and shows why it is not.",
  ],
  controversy: [
    "A caution, a loose-usage note, or one accepted meaning. No disagreement is described.",
    "Hints that people differ, but does not show two real positions on meaning or scope.",
    "A genuine practitioner disagreement about what the term means or how far it extends.",
  ],
};

export const FIT_TOP = FIT_LEVELS.definition.length - 1;

export function fieldText(term: EvalTerm, field: TermField): string | null {
  const value = term[FIELD_PROP[field]];
  return value?.trim() ? value.trim() : null;
}

export function presentTerm(term: EvalTerm): Partial<Record<TermField, string>> {
  const present: Partial<Record<TermField, string>> = {};
  for (const field of TERM_FIELDS) {
    const text = fieldText(term, field);
    if (text) present[field] = text;
  }
  return present;
}
