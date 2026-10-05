import type { CollectionKind } from "@/lib/terms/kinds";

type Copy = {
  definitionToTerm: string;
  maskedExample: string;
  typedCloze: string;
  typedMeaningToWord: string;
  termToMeaning: (term: string) => string;
  doesItFit: (term: string) => string;
};

/** Question wording per collection kind; the template logic is shared. */
export const QUIZ_COPY: Record<CollectionKind, Copy> = {
  terms: {
    definitionToTerm: "Which term matches this definition?",
    maskedExample: "Which term fits the blank?",
    typedCloze: "Type the term that fits the blank.",
    typedMeaningToWord: "Type the term that matches this definition.",
    termToMeaning: (term) => `Which definition fits “${term}”?`,
    doesItFit: (term) => `Is this an example of “${term}”?`,
  },
  vocabulary: {
    definitionToTerm: "Which word or phrase means this?",
    maskedExample: "Which word or phrase fits the blank?",
    typedCloze: "Type the word or phrase that fits the blank.",
    typedMeaningToWord: "Type the word or phrase that means this.",
    termToMeaning: (term) => `What does “${term}” mean?`,
    doesItFit: (term) => `Is this an example of “${term}”?`,
  },
};
