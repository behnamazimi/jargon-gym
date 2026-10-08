import type { CollectionLanguage } from "./languages";

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
  category: string | null;
  definition: string;
  example: string;
  mentalModel?: string;
  discussion: string;
  antiExample?: string;
  controversy?: string;
  note?: string;
  relationships: TermRelationship[];
  /** The job id of this term's current narration clip. null: there is none yet.
   *  Absent: not looked up. Set only where the term is served to a player. */
  narrationVersion?: string | null;
};

/** A term with no definition yet. It is saved but stays out of study. */
export type UnfinishedTerm = Omit<Term, "definition"> & { definition: null };

/** The Library's lightweight row: enough to list, search, filter and sort.
 *  The rest of a term is fetched when its card is about to be shown. */
export type LibraryTerm = Pick<Term, "id" | "term" | "category" | "definition">;

export type UnfinishedLibraryTerm = Pick<UnfinishedTerm, "id" | "term" | "category">;

export type CollectionSource = "owned" | "added";

export type Collection = {
  id: string;
  name: string;
  icon: string;
  description: string;
  visibility: "private" | "shared";
  language: CollectionLanguage;
  source: CollectionSource;
  isActiveForReview: boolean;
  termCount: number;
  /** Terms without a definition. Only the owner ever sees a non-zero count. */
  unfinishedCount: number;
  knownCount: number;
  termsLearnedCount: number;
  markedKnownCount: number;
  isBuiltin: boolean;
  loveCount: number;
  /** Why sharing was turned off for this collection; null when it wasn't. Only the owner is shown it. */
  shareBlockedReason: string | null;
  lovedByMe: boolean;
  reportedByMe: boolean;
};

export type FullLibraryPageData = {
  collection: Collection;
  collections: Collection[];
  terms: Term[];
  unfinishedTerms: UnfinishedTerm[];
  knownTermIds: string[];
  markedKnownTermIds: string[];
  everMasteredTermIds: string[];
  activeCollectionIds: string[];
};

/** One collection as the Library shows it. `loadedAt` (server time) lets
 *  newer local edits win over this snapshot and older ones lose to it. */
export type LibraryPageData = {
  collection: Collection;
  terms: LibraryTerm[];
  unfinishedTerms: UnfinishedLibraryTerm[];
  knownTermIds: string[];
  markedKnownTermIds: string[];
  everMasteredTermIds: string[];
  loadedAt: number;
};

export type SortMode = "default" | "category" | "az" | "unknown";

export type FilterOptions = {
  searchQuery: string;
  activeCategories: Set<string>;
  hideKnown: boolean;
  sortMode: SortMode;
  knownTerms: Set<string>;
  markedKnownTerms: Set<string>;
};

export type SharedCollection = {
  id: string;
  name: string;
  icon: string;
  description: string;
  ownerId: string;
  termCount: number;
  inCollection: boolean;
  isBuiltin: boolean;
  loveCount: number;
  lovedByMe: boolean;
  reportedByMe: boolean;
};
