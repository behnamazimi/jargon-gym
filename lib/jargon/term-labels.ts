import type { DomainLanguage } from "./languages";

export type TermLabels = {
  mentalModel: string;
  example: string;
  antiExample: string;
  discussion: string;
  controversy: string;
  note: string;
  relatedTerms: string;
  searchOnGoogle: (term: string) => string;
};

export const TERM_LABELS: Record<DomainLanguage, TermLabels> = {
  en: {
    mentalModel: "Mental model",
    example: "Example",
    antiExample: "Anti-example",
    discussion: "In practice",
    controversy: "Debated",
    note: "Note",
    relatedTerms: "Related terms",
    searchOnGoogle: (term) => `Search “${term}” on Google`,
  },
  nl: {
    mentalModel: "Zie het zo",
    example: "Bijvoorbeeld",
    antiExample: "Zo niet",
    discussion: "In de praktijk",
    controversy: "Discussie",
    note: "Notitie",
    relatedTerms: "Verwante termen",
    searchOnGoogle: (term) => `Zoek “${term}” op Google`,
  },
};
