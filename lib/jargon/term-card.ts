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
};
