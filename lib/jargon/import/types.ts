type ImportTerm = {
  term: string;
  category: string;
  definition: string;
  example?: string | null;
  mental_model?: string | null;
  discussion?: string | null;
  anti_example?: string | null;
  controversy?: string | null;
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
  path: string;
  message: string;
  expected?: string;
  received?: string;
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

export type ImportPreview = {
  domain: string;
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
