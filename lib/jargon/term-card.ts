/** Presentation-neutral term card (from get_term_card RPC). */

export type TermCardRelationship = {
  direction: "outgoing" | "incoming";
  relationshipType: string;
  relatedTermName: string;
  description: string;
};

export type TermCard = {
  id: string;
  term: string;
  category: string;
  definition: string;
  example: string | null;
  mentalModel: string | null;
  discussion: string | null;
  antiExample: string | null;
  controversy: string | null;
  domainId: string;
  domainName: string;
  relationships: TermCardRelationship[];
  /** True when this term had no review_state activity at all (no read,
   *  review, or quiz) the moment it was picked for this queue — i.e. this
   *  is the very first time the user is being shown it. Drives the
   *  first-exposure "mark known" prompt in Read/Review. */
  isNewToUser?: boolean;
};
