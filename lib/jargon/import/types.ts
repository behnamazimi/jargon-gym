import type { DomainLanguage } from "@/lib/jargon/languages";

type ImportTerm = {
  term: string;
  category: string;
  definition: string;
  example?: string | null;
  mental_model?: string | null;
  discussion?: string | null;
  anti_example?: string | null;
  controversy?: string | null;
  note?: string | null;
};

type ImportRelationship = {
  source: string;
  target: string;
  relationship_type: string;
  description?: string;
};

export type ImportPayload = {
  domain: string;
  description?: string | null;
  terms: ImportTerm[];
  relationships?: ImportRelationship[];
};

export type ImportValidationIssue = {
  message: string;
};

type ImportFailureContext = {
  term?: string;
  domain?: string;
};

export type ImportFailure = {
  title: string;
  message: string;
  details?: string[];
  hint?: string;
  code?: string;
  issues?: ImportValidationIssue[];
  context?: ImportFailureContext;
};

export type ImportOverrides = {
  domainName?: string;
  language?: DomainLanguage;
};

export type ImportPreview = {
  domain: string;
  /** The existing collection's language when this import merges into one. */
  domainLanguage: DomainLanguage | null;
  termCount: number;
  relationshipCount: number;
  categories: string[];
  isMerge: boolean;
  conflictingTerms: string[];
};

export type ImportResult = {
  domainId: string;
  domainName: string;
  termsCreated: number;
  termsUpdated: number;
  relationshipsCreated: number;
  relationshipsUpdated: number;
};
