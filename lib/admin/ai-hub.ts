import { FEATURES, type FeatureId } from "@/lib/ai/registry";
import type { FeatureHealth } from "@/lib/ai/health";
import { AI_FEATURE_META } from "./ai-features";

export type AiSettingsRow = {
  feature: string;
  enabled: boolean;
  credit_cost: number | null;
  daily_cap: number | null;
};

/** `mixed`: the two narration features disagree, which only happens if one was changed outside the page. */
type AiHubState = "on" | "off" | "mixed" | "unknown" | "always-on";

export type AiHubRow = {
  id: "quiz" | "story" | "term_evaluation" | "narration";
  label: string;
  vendor: string;
  sends: string;
  billing: "credits" | "none";
  state: AiHubState;
  healthNote: string | null;
  limit: string;
  manageHref: string;
};

function plural(count: number, unit: string): string {
  return `${count} ${count === 1 ? "credit" : "credits"} per ${unit}`;
}

function narrationState(term: AiSettingsRow | undefined, story: AiSettingsRow | undefined) {
  if (!term || !story) return "unknown";
  if (term.enabled && story.enabled) return "on";
  return term.enabled || story.enabled ? "mixed" : "off";
}

function narrationLimit(term: AiSettingsRow | undefined, story: AiSettingsRow | undefined) {
  if (!term || !story) return "—";
  const terms = term.daily_cap === null ? "no limit" : `${term.daily_cap} a day`;
  const stories = story.daily_cap === null ? "no limit" : `${story.daily_cap} a day`;
  return `Terms: ${terms}. Stories: ${stories}.`;
}

/** The AI features an admin manages, one row each. Narration is one row: its two
 *  features are switched together. `settings` is null when it couldn't be read. */
export function buildAiHubRows(
  settings: AiSettingsRow[] | null,
  healthOf: (feature: FeatureId) => FeatureHealth,
): AiHubRow[] {
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
      limit: row?.credit_cost ? plural(row.credit_cost, def.unit) : "—",
      manageHref: AI_FEATURE_META[feature].manageHref,
    };
  };

  const term = byFeature.get("narration_term");
  const story = byFeature.get("narration_story");
  const narration = FEATURES.narration_term;
  const evaluation = FEATURES.term_evaluation;

  return [
    credited("quiz"),
    credited("story"),
    {
      id: "term_evaluation",
      label: AI_FEATURE_META.term_evaluation.label,
      vendor: evaluation.vendor,
      sends: evaluation.sends,
      billing: "none",
      state: "always-on",
      healthNote: note("term_evaluation"),
      limit: "—",
      manageHref: AI_FEATURE_META.term_evaluation.manageHref,
    },
    {
      id: "narration",
      label: "Narration",
      vendor: narration.vendor,
      sends: `${narration.sends} Stories too: ${FEATURES.narration_story.sends}`,
      billing: "none",
      state: narrationState(term, story),
      healthNote: note("narration_term"),
      limit: narrationLimit(term, story),
      manageHref: AI_FEATURE_META.narration_term.manageHref,
    },
  ];
}
