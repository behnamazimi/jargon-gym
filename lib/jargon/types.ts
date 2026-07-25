export type TermRelationship = {
  id: string;
  relationshipType: string;
  description: string;
  direction: "outgoing" | "incoming";
  relatedTermId: string;
  relatedTermName: string;
};

export type Term = {
  id: string;
  term: string;
  category: string;
  definition: string;
  example: string;
  discussion: string;
  controversy?: string;
  relationships: TermRelationship[];
};

export type DomainSource = "owned" | "added";

export type Domain = {
  id: string;
  name: string;
  icon: string;
  description: string;
  visibility: "private" | "shared";
  source: DomainSource;
  isActiveForReview: boolean;
  termCount: number;
  knownCount: number;
};

export type JargonPageData = {
  domain: Domain;
  domains: Domain[];
  terms: Term[];
  knownTermIds: string[];
  activeDomainIds: string[];
};

export type SortMode = "default" | "az" | "unknown";

export type FilterOptions = {
  searchQuery: string;
  activeCategories: Set<string>;
  hideKnown: boolean;
  sortMode: SortMode;
  knownTerms: Set<string>;
};

export type SharedDomain = {
  id: string;
  name: string;
  icon: string;
  description: string;
  ownerId: string;
  termCount: number;
  inCollection: boolean;
};
