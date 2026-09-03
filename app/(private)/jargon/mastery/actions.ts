"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import {
  CALIBRATION_MIN_BUCKET_SAMPLE,
  summarizeGradeDistribution,
  type ReviewGrade,
} from "@/lib/trace";

export type GradeDistributionSummary = {
  counts: Record<ReviewGrade, number>;
  total: number;
};

/** User-facing grade-usage breakdown for the Mastery overview — how often
 *  each FSRS-5 grade gets used across this user's own review_pass/fail
 *  history, purely descriptive (no "you're too generous" framing). A
 *  narrower sibling of the debug page's getCalibrationSummaryAction: same
 *  underlying summarizeGradeDistribution, but this returns only the
 *  counts a user should see, not the debug-only calibration/attention
 *  fields. Null below CALIBRATION_MIN_BUCKET_SAMPLE total gradings — same
 *  "not enough data yet" bar the debug page's own buckets use. */
export async function getGradeDistributionAction(): Promise<GradeDistributionSummary | null> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return null;

  const { data, error } = await auth.supabase
    .from("review_events")
    .select("grade")
    .in("event", ["review_pass", "review_fail"]);
  if (error) throw error;

  const counts = summarizeGradeDistribution(data);
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  if (total < CALIBRATION_MIN_BUCKET_SAMPLE) return null;

  return { counts, total };
}
