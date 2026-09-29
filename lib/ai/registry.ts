export type Capability = "object" | "text" | "evaluate" | "speech";

type FeatureDefinition = {
  capability: Capability;
  /** "credits" features are charged from the ledger; "none" features never are. */
  billing: "credits" | "none";
  vendor: string;
  /** What leaves the app, in plain words. */
  sends: string;
  unit: string;
};

/** Every AI feature in the app. `ai_feature_settings` has one row for each. */
export const FEATURES = {
  quiz: {
    capability: "object",
    billing: "credits",
    vendor: "Google or Anthropic",
    sends: "Term names, definitions and examples from the collections you quiz on.",
    unit: "question",
  },
  story: {
    capability: "text",
    billing: "credits",
    vendor: "Google or Anthropic",
    sends: "Term names, definitions and the story outline you pick.",
    unit: "term",
  },
  term_evaluation: {
    capability: "evaluate",
    billing: "none",
    vendor: "TypeSafe (Jev) through Vercel AI Gateway",
    sends: "The full text of the term entry being checked.",
    unit: "term",
  },
  narration_term: {
    capability: "speech",
    billing: "none",
    vendor: "ElevenLabs",
    sends: "The spoken text of a term entry.",
    unit: "clip",
  },
  narration_story: {
    capability: "speech",
    billing: "none",
    vendor: "ElevenLabs",
    sends: "The full text of a story.",
    unit: "clip",
  },
} as const satisfies Record<string, FeatureDefinition>;

export type FeatureId = keyof typeof FEATURES;

export type BillableFeatureId = {
  [K in FeatureId]: (typeof FEATURES)[K]["billing"] extends "credits" ? K : never;
}[FeatureId];

export const FEATURE_IDS = Object.keys(FEATURES) as FeatureId[];

export function isBillable(feature: FeatureId): feature is BillableFeatureId {
  return FEATURES[feature].billing === "credits";
}
