/** Smart queue algorithm — public API.
 *  KEEP IN SYNC with supabase/functions/_shared/smart-queue/index.ts
 *
 *  DB adapters live in ./service.ts — import those directly from server code.
 *  Human overview: docs/smart-queue.md
 */

export type {
  ReviewOutcome,
  ReviewPreset,
  ReviewCandidate,
  ScoreWeights,
  PoolStats,
  ScoredCandidate,
} from "./types";

export { getPresetWeights } from "./presets";
export { computeScore } from "./score";
export { pickTerms } from "./pick";
export { computePoolStats } from "./stats";
