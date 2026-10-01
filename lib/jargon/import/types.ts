import type { DomainLanguage } from "@/lib/jargon/languages";

type ImportTerm = {
  term: string;
  category?: string | null;
  definition?: string | null;
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
  language?: DomainLanguage;
  terms: ImportTerm[];
  relationships?: ImportRelationship[];
};

export type ImportValidationIssue = {
  message: string;
};

export type ImportFailure = {
  title: string;
  message: string;
  details?: string[];
  hint?: string;
  code?: string;
  issues?: ImportValidationIssue[];
};
