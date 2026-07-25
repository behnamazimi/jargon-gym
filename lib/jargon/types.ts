export type Term = {
  term: string;
  category: string;
  definition: string;
  example: string;
  discussion: string;
  controversy?: string;
};

export type Domain = {
  id: string;
  name: string;
  icon: string;
};

export type SortMode = "default" | "az" | "unknown";

export type FilterOptions = {
  searchQuery: string;
  activeCategories: Set<string>;
  hideKnown: boolean;
  sortMode: SortMode;
  knownTerms: Set<string>;
};
