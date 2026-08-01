/** Smart queue algorithm — public API.
 *  KEEP IN SYNC with lib/smart-queue/index.ts
 *
 *  Note: Deno runtime cannot import the Next.js service adapter.
 *  Callers use ../smart-queue-service.ts for DB I/O.
 *  Human overview: docs/smart-queue.md
 */

export type {
  ReviewOutcome,
  ReviewPreset,
  ReviewCandidate,
  ScoreWeights,
  PoolStats,
  ScoredCandidate,
} from "./types.ts";

export { getPresetWeights } from "./presets.ts";
export { computeScore } from "./score.ts";
export { pickTerms } from "./pick.ts";
export { computePoolStats } from "./stats.ts";
