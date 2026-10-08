import { FEATURES, type FeatureId } from "@/lib/ai/registry";
import type { FeatureHealth } from "@/lib/ai/health";
import { AI_FEATURE_META } from "./ai-features";

export type AiSettingsRow = {
  feature: string;
  enabled: boolean;
  daily_cap: number | null;
};

export type AiPriceRow = {
  feature: string;
  base_credits: number;
  credits_per_unit: number;
  unit_size: number;
};

/** `mixed`: the two narration features disagree, which only happens if one was changed outside the page. */
type AiHubState = "on" | "off" | "mixed" | "unknown";

export type AiHubRow = {
  id: "quiz" | "story" | "narration";
  label: string;
  vendor: string;
  sends: string;
  /** `partial`: some of its features are charged and some are not. */
  billing: "credits" | "none" | "partial";
  state: AiHubState;
  healthNote: string | null;
  limit: string;
  manageHref: string;
};

function plural(count: number, word: string): string {
  return `${count} ${count === 1 ? word : `${word}s`}`;
}

function creditPrice(price: AiPriceRow | undefined, unit: string): string {
  if (!price) return "—";
  const per = price.unit_size === 1 ? unit : `${price.unit_size.toLocaleString("en-US")} ${unit}s`;
  const rate = `${price.credits_per_unit} per ${per}`;
  return price.base_credits > 0
    ? `${plural(price.base_credits, "credit")} + ${rate}`
    : `${plural(price.credits_per_unit, "credit")} per ${per}`;
}

function narrationState(term: AiSettingsRow | undefined, story: AiSettingsRow | undefined) {
  if (!term || !story) return "unknown";
  if (term.enabled && story.enabled) return "on";
  return term.enabled || story.enabled ? "mixed" : "off";
}

function narrationLimit(
  term: AiSettingsRow | undefined,
  story: AiSettingsRow | undefined,
  storyPrice: AiPriceRow | undefined,
) {
  if (!term || !story) return "—";
  const terms = term.daily_cap === null ? "no limit" : `${term.daily_cap} a day`;
  const stories = story.daily_cap === null ? "no limit" : `${story.daily_cap} a day`;
  const price = storyPrice ? `, ${creditPrice(storyPrice, "character")}` : "";
  return `Terms: ${terms}. Stories: ${stories}${price}.`;
}

/** The AI features an admin manages, one row each. Narration is one row: its two
 *  features are switched together. `settings` is null when it couldn't be read. */
export function buildAiHubRows(
  settings: AiSettingsRow[] | null,
  healthOf: (feature: FeatureId) => FeatureHealth,
  prices: AiPriceRow[] | null = null,
): AiHubRow[] {
  const priceOf = new Map((prices ?? []).map((row) => [row.feature, row]));
  const byFeature = new Map((settings ?? []).map((row) => [row.feature, row]));
  const note = (feature: FeatureId) => {
    const health = healthOf(feature);
    return health.ok ? null : health.note;
  };

  const credited = (feature: "quiz" | "story"): AiHubRow => {
    const row = byFeature.get(feature);
    const def = FEATURES[feature];
    return {
      id: feature,
      label: AI_FEATURE_META[feature].label,
      vendor: def.vendor,
      sends: def.sends,
      billing: "credits",
      state: row ? (row.enabled ? "on" : "off") : "unknown",
      healthNote: note(feature),
      limit: creditPrice(priceOf.get(feature), def.unit),
      manageHref: AI_FEATURE_META[feature].manageHref,
    };
  };

  const term = byFeature.get("narration_term");
  const story = byFeature.get("narration_story");
  const narration = FEATURES.narration_term;

  return [
    credited("quiz"),
    credited("story"),
    {
      id: "narration",
      label: "Narration",
      vendor: narration.vendor,
      sends: `${narration.sends} Stories too: ${FEATURES.narration_story.sends}`,
      billing: "partial",
      state: narrationState(term, story),
      healthNote: note("narration_term") ?? note("narration_story"),
      limit: narrationLimit(term, story, priceOf.get("narration_story")),
      manageHref: AI_FEATURE_META.narration_term.manageHref,
    },
  ];
}
