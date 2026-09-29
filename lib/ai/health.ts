import { getCentralLlmConfig } from "@/lib/llm/central";
import type { FeatureId } from "./registry";

export type FeatureHealth = { ok: true } | { ok: false; note: string };

const CREDITS_KEY_NOTE =
  "The app's own AI key isn't set up, so AI credits can't be used. People with their own key aren't affected.";

function missing(...names: string[]): string | null {
  const absent = names.filter((name) => !process.env[name]?.trim());
  return absent.length > 0 ? `Missing ${absent.join(", ")}.` : null;
}

/** Whether what the feature needs is configured, judged from the environment. */
export function featureHealth(feature: FeatureId): FeatureHealth {
  switch (feature) {
    case "quiz":
    case "story":
      return getCentralLlmConfig() ? { ok: true } : { ok: false, note: CREDITS_KEY_NOTE };
    case "term_evaluation": {
      const note = missing("AI_GATEWAY_API_KEY");
      return note ? { ok: false, note } : { ok: true };
    }
    case "narration_term":
    case "narration_story": {
      const note = missing(
        "ELEVENLABS_API_KEY",
        "SUPABASE_S3_ENDPOINT",
        "SUPABASE_S3_REGION",
        "SUPABASE_S3_ACCESS_KEY_ID",
        "SUPABASE_S3_SECRET_ACCESS_KEY",
        "SUPABASE_S3_BUCKET",
      );
      return note ? { ok: false, note } : { ok: true };
    }
  }
}
