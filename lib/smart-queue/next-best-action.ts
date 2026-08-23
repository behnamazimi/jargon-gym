/** "What should I do next" reducer — walks the read → review → quiz
 *  pipeline in that fixed order (not a cross-activity severity ranking) and
 *  flags the first stage(s) that aren't keeping up, using the same
 *  poolRotationStats signals rotation-insight.ts's debug diagnostics use:
 *  "have you touched this pool at all" and "is your pace keeping it fresh".
 *  Deliberately domain- and count-agnostic — the goal is "which activity
 *  needs you", not "which domain" or "how many terms".
 */

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchActiveReviewCandidates } from "./service";
import { fieldsForContext } from "./score";
import { poolRotationStats, type RawStats } from "./rotation-insight";
import type { PickContext, ReviewCandidate } from "./types";

type Client = SupabaseClient<Database>;

export type NextBestActionHint = {
  id: PickContext;
  context: PickContext;
  actionLabel: string;
  message: string;
  ctaHref: string;
};

const ACTION_LABEL: Record<PickContext, string> = {
  read: "Start reading",
  review: "Review now",
  quiz: "Take a quiz",
};

const CTA_PATH: Record<PickContext, string> = {
  read: "/jargon/read",
  review: "/jargon/review",
  quiz: "/jargon/quiz",
};

/** Pipeline order — read is checked first, then review, then quiz. This is
 *  a fixed priority, not a severity ranking: a read problem always outranks
 *  a review or quiz problem, because there's nothing to review/quiz until
 *  it's been read. */
const PIPELINE_ORDER: readonly PickContext[] = ["read", "review", "quiz"];

type Flavor = "not_started" | "pace";

/** Which reason (if any) this stage needs attention: "not_started" when
 *  some of the pool has never been touched in this activity at all, else
 *  "pace" when the pool has been touched but is falling behind — either
 *  because the recent rate can't keep it inside the 7-day freshness
 *  window (overSafeLine), it's already sitting past that window
 *  (staleCapCount), or it's actively regressing (strugglingCount). */
function flavorFor(stats: RawStats): Flavor | null {
  if (stats.neverTouchedCount > 0) return "not_started";
  if (stats.overSafeLine || stats.staleCapCount > 0 || stats.strugglingCount > 0) return "pace";
  return null;
}

const MESSAGE_BY_FLAVOR_AND_CONTEXT: Record<Flavor, Record<PickContext, string>> = {
  not_started: {
    read: "There are terms you haven't read yet",
    review: "There are terms you haven't reviewed yet",
    quiz: "There are terms you haven't quizzed yet",
  },
  pace: {
    read: "Your reading pace has slipped",
    review: "Your review pace has slipped",
    quiz: "Your quiz pace has slipped",
  },
};

function statsForCandidates(
  candidates: ReviewCandidate[],
  context: PickContext,
  now: Date,
): RawStats {
  return poolRotationStats(
    candidates.map((c) => fieldsForContext(c, context)),
    now,
  );
}

/** How fresh a touch has to be to count as "still mid-session" for the
 *  not_started gate below — long enough to survive a page navigation
 *  between terms, short enough that it's clearly the same sitting rather
 *  than "sometime today". */
const ACTIVE_SESSION_WINDOW_MS = 15 * 60 * 1000;

/** Most recent own-context activity across the whole pool — used only to
 *  ask "is the user actively mid-session on this pool right now", not to
 *  measure pace (pace already comes from poolRotationStats's own live
 *  7-day window, which self-corrects as the user works and needs no extra
 *  history). */
function mostRecentActivityAt(candidates: ReviewCandidate[], context: PickContext): Date | null {
  let latest: Date | null = null;
  for (const candidate of candidates) {
    const at = fieldsForContext(candidate, context).lastActivityAt;
    if (at && (!latest || at > latest)) latest = at;
  }
  return latest;
}

/** not_started fires whenever any part of the pool has never been touched —
 *  including a pool the user is midway through clearing right now. Gate it
 *  on recent activity in this same context so mid-session progress doesn't
 *  get interrupted by a nag about the terms not yet reached; pace doesn't
 *  need this gate since overSafeLine/staleCapCount/strugglingCount are
 *  already live rolling-window numbers that ease off on their own as the
 *  user keeps a pace that clears them. */
function isMidSession(candidates: ReviewCandidate[], context: PickContext, now: Date): boolean {
  const lastActivity = mostRecentActivityAt(candidates, context);
  if (!lastActivity) return false;
  return now.getTime() - lastActivity.getTime() < ACTIVE_SESSION_WINDOW_MS;
}

/** Pure reducer — checks each pipeline stage in fixed read/review/quiz
 *  order and returns a hint for every stage that isn't keeping up (skipping
 *  stages with no pool to check). Split from the fetching wrapper below so
 *  it's directly unit-testable. Order is preserved as pipeline priority,
 *  not severity — the client picks the first surviving one for whichever
 *  page it's suppressed on. */
export function reducePipelineHints(
  unknownCandidates: ReviewCandidate[],
  knownCandidates: ReviewCandidate[],
  now: Date,
): NextBestActionHint[] {
  const contextCandidates: Record<PickContext, ReviewCandidate[]> = {
    read: unknownCandidates,
    quiz: knownCandidates,
    review: [...unknownCandidates, ...knownCandidates],
  };

  const hints: NextBestActionHint[] = [];

  for (const context of PIPELINE_ORDER) {
    const candidates = contextCandidates[context];
    if (candidates.length === 0) continue;

    const stats = statsForCandidates(candidates, context, now);
    const flavor = flavorFor(stats);
    if (flavor === null) continue;
    if (flavor === "not_started" && isMidSession(candidates, context, now)) continue;

    hints.push({
      id: context,
      context,
      actionLabel: ACTION_LABEL[context],
      message: MESSAGE_BY_FLAVOR_AND_CONTEXT[flavor][context],
      ctaHref: CTA_PATH[context],
    });
  }

  return hints;
}

export const getNextBestActionHints = cache(async function getNextBestActionHints(
  client: Client,
  userId: string,
  now: Date = new Date(),
): Promise<NextBestActionHint[]> {
  const [unknownCandidates, knownCandidates] = await Promise.all([
    fetchActiveReviewCandidates(client, userId, "unknown"),
    fetchActiveReviewCandidates(client, userId, "known"),
  ]);

  return reducePipelineHints(unknownCandidates, knownCandidates, now);
});
