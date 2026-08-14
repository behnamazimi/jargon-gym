export type WidgetTerm = {
  id: string;
  term: string;
  category: string;
  definition: string;
  domainId: string;
  domainName: string;
};

export type WidgetStateResponse = {
  terms: WidgetTerm[]; // peeked batch, length 0–10, mixed Read order
  totalCount: number;
  knownCount: number;
};

export type WidgetTokenRow = {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
};
