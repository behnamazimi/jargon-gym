"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import type { Database } from "@/lib/supabase/database.types";
import {
  findAbandonedReveals,
  summarizeActivityTimeline,
  summarizeCalibration,
  summarizeGradeDistribution,
  type AbandonedReveal,
  type ActivityDay,
  type CalibrationSummary,
  type ReviewGrade,
} from "@/lib/trace";

async function lookupTermNames(
  supabase: SupabaseClient<Database>,
  termIds: string[],
): Promise<Map<string, string>> {
  if (termIds.length === 0) return new Map();

  const { data: terms, error } = await supabase.from("terms").select("id, term").in("id", termIds);

  if (error) throw error;

  return new Map(terms.map((term) => [term.id, term.term]));
}

/** How many days of recent `review_events` back the Activity table on the
 *  Calibration tab — see summarizeActivityTimeline's doc for why this is a
 *  separate, date-bounded query rather than reusing the all-time one below
 *  (that one deliberately excludes "read" events; this one needs them). */
const ACTIVITY_TIMELINE_DAYS = 14;

export type CalibrationViewData = {
  recall: CalibrationSummary;
  recognition: CalibrationSummary;
  abandonedReveals: Array<AbandonedReveal & { term: string }>;
  gradeDistribution: Record<ReviewGrade, number>;
  activityTimeline: ActivityDay[];
};

/** Global on purpose — calibration is a question about the algorithm, not
 *  one collection, and this is scoped to whichever single account is
 *  currently logged in (session client, RLS: auth.uid() = user_id) — the
 *  UI should say so, this isn't an aggregate across users. */
export async function getCalibrationSummaryAction(): Promise<{
  data?: CalibrationViewData;
  error?: string;
}> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view this." };
  }

  const now = new Date();
  const activityWindowStart = new Date(
    now.getTime() - ACTIVITY_TIMELINE_DAYS * 24 * 60 * 60 * 1000,
  );

  const [{ data: events, error }, { data: recentEvents, error: recentEventsError }] =
    await Promise.all([
      auth.supabase
        .from("review_events")
        .select("term_id, event, grade, retrievability_before, created_at")
        .in("event", ["reveal", "review_pass", "review_fail", "quiz_pass", "quiz_fail"]),
      // Separate, date-bounded query — unlike the one above, this needs "read"
      // events too, and stays cheap by not going back further than the window.
      auth.supabase
        .from("review_events")
        .select("event, created_at")
        .gte("created_at", activityWindowStart.toISOString()),
    ]);

  if (error) return { error: error.message };
  if (recentEventsError) return { error: recentEventsError.message };

  const rows = events ?? [];

  const activityTimeline = summarizeActivityTimeline(
    (recentEvents ?? []).map((e) => ({ event: e.event, createdAt: new Date(e.created_at) })),
    { now, days: ACTIVITY_TIMELINE_DAYS },
  );

  const recallRows = rows
    .filter((e) => e.event === "review_pass" || e.event === "review_fail")
    .map((e) => ({
      retrievabilityBefore: e.retrievability_before,
      passed: e.event === "review_pass",
    }));

  const gradeDistribution = summarizeGradeDistribution(
    rows
      .filter((e) => e.event === "review_pass" || e.event === "review_fail")
      .map((e) => ({ grade: e.grade })),
  );

  const recognitionRows = rows
    .filter((e) => e.event === "quiz_pass" || e.event === "quiz_fail")
    .map((e) => ({
      retrievabilityBefore: e.retrievability_before,
      passed: e.event === "quiz_pass",
    }));

  const revealSequenceRows = rows
    .filter((e) => e.event === "reveal" || e.event === "review_pass" || e.event === "review_fail")
    .map((e) => ({ termId: e.term_id, event: e.event, createdAt: new Date(e.created_at) }));

  const abandoned = findAbandonedReveals(revealSequenceRows, { now }).slice(0, 10);

  const termNameById = await lookupTermNames(auth.supabase, [
    ...new Set(abandoned.map((a) => a.termId)),
  ]);

  return {
    data: {
      recall: summarizeCalibration(recallRows),
      recognition: summarizeCalibration(recognitionRows),
      abandonedReveals: abandoned.map((a) => ({
        ...a,
        term: termNameById.get(a.termId) ?? "(deleted term)",
      })),
      gradeDistribution,
      activityTimeline,
    },
  };
}
