import type { FeatureId } from "@/lib/ai/registry";

/** What the admin pages call each AI feature and where it is managed. */
export const AI_FEATURE_META: Record<FeatureId, { label: string; manageHref: string }> = {
  quiz: { label: "AI quiz", manageHref: "/admin/ai/credits" },
  story: { label: "Stories", manageHref: "/admin/ai/credits" },
  term_evaluation: { label: "Term evaluation", manageHref: "/admin/ai" },
  narration_term: { label: "Term narration", manageHref: "/admin/ai/narration" },
  narration_story: { label: "Story narration", manageHref: "/admin/ai/narration" },
};
