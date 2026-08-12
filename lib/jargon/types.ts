import type { Strength } from "@/lib/smart-queue";

export type TermRelationship = {
  id: string;
  relationshipType: string;
  description: string;
  direction: "outgoing" | "incoming";
  relatedTermId: string;
  relatedTermName: string;
};

/** Raw relationship row with both term names resolved (for hydrate / browse). */
export type TermRelationshipLink = {
  id: string;
  relationship_type: string;
  description: string;
  source_term_id: string;
  target_term_id: string;
  source_term_name: string;
  target_term_name: string;
};

export type Term = {
  id: string;
  term: string;
  category: string;
  definition: string;
  example: string;
  mentalModel?: string;
  discussion: string;
  antiExample?: string;
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
  /** Display-only mastery tier per term, from review history. Never affects scoring. */
  strengthByTermId: Record<string, Strength>;
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
