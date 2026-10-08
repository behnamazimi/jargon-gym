/** Presentation-neutral term card (from get_term_card RPC). */

import type { CollectionLanguage } from "./languages";

export type TermCardRelationship = {
  direction: "outgoing" | "incoming";
  relationshipType: string;
  relatedTermName: string;
  description: string;
};

export type TermCard = {
  id: string;
  term: string;
  category: string | null;
  definition: string;
  example: string | null;
  mentalModel: string | null;
  discussion: string | null;
  antiExample: string | null;
  controversy: string | null;
  note: string | null;
  collectionId: string;
  collectionName: string;
  collectionLanguage: CollectionLanguage;
  relationships: TermCardRelationship[];
  /** True when this term had no review_state activity at all (no read,
   *  review, or quiz) the moment it was picked for this queue — i.e. this
   *  is the very first time the user is being shown it. Drives the
   *  first-exposure "mark known" prompt in Read/Review. */
  isNewToUser?: boolean;
  /** What Quiz knows about the learner's recognition of this term when it was
   *  picked. Set only by the quiz pickers. */
  recognition?: { posterior: number | null; testCount: number };
};
