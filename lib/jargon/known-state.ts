import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeOverallStrength,
  type OverallStrength,
  type ReviewCandidate,
} from "@/lib/smart-queue";
import type { Database } from "@/lib/supabase/database.types";
import { fetchUserCollection } from "./collections";

type Client = SupabaseClient<Database>;

/** Known-term IDs for the given collections, including paused ones.
 *  Pass the collections you want to display — not `reviewDomainIds`, which
 *  drops paused collections and would make their known terms look unknown. */
export async function fetchKnownTermIdsForDomains(
  client: Client,
  domainIds: string[],
  userId: string,
) {
  if (domainIds.length === 0) return [];

  const { data: terms, error: termsError } = await client
    .from("terms")
    .select("id")
    .in("domain_id", domainIds);

  if (termsError) throw termsError;
  if (terms.length === 0) return [];

  const termIds = terms.map((t) => t.id);
  const { data, error } = await client
    .from("user_progress")
    .select("term_id")
    .eq("user_id", userId)
    .in("term_id", termIds);

  if (error) throw error;
  return data.map((row) => row.term_id);
}

export type OverallStrengthRow = {
  termId: string;
  score: number;
  bucket: OverallStrength;
  bars: number;
};

/** Display-only overall mastery per term, blended across Read/Review/Quiz —
 *  see computeOverallStrength. Two queries (review_state + user_progress),
 *  merged in TS, mirroring the shape the RPC-fed ReviewCandidate normally
 *  has — deliberately NOT reusing the known/unknown RPCs here, since those
 *  are scoped to active review domains only and this must also work for a
 *  paused domain the collection page is still allowed to display. */
export async function fetchOverallStrengthByTermId(
  client: Client,
  termIds: string[],
  userId: string,
): Promise<Record<string, OverallStrengthRow>> {
  if (termIds.length === 0) return {};

  const [{ data: reviewRows, error: reviewError }, { data: progressRows, error: progressError }] =
    await Promise.all([
      client
        .from("review_state")
        .select(
          "term_id, read_count, last_read_at, review_recall_count, last_review_recall_at, review_streak, review_fail_count, quiz_test_count, last_quiz_tested_at, quiz_streak, quiz_fail_count",
        )
        .eq("user_id", userId)
        .in("term_id", termIds),
      client
        .from("user_progress")
        .select("term_id, known_at")
        .eq("user_id", userId)
        .in("term_id", termIds),
    ]);

  if (reviewError) throw reviewError;
  if (progressError) throw progressError;

  const knownAtByTermId = new Map(progressRows.map((r) => [r.term_id, r.known_at]));
  const reviewByTermId = new Map(reviewRows.map((r) => [r.term_id, r]));
  const now = new Date();
  const result: Record<string, OverallStrengthRow> = {};

  for (const termId of termIds) {
    const rs = reviewByTermId.get(termId);
    const knownAt = knownAtByTermId.get(termId);
    const candidate: ReviewCandidate = {
      termId,
      domainId: "",
      createdAt: new Date(0),
      readCount: rs?.read_count ?? 0,
      lastReadAt: rs?.last_read_at ? new Date(rs.last_read_at) : null,
      reviewRecallCount: rs?.review_recall_count ?? 0,
      lastReviewRecallAt: rs?.last_review_recall_at ? new Date(rs.last_review_recall_at) : null,
      reviewStreak: rs?.review_streak ?? 0,
      quizTestCount: rs?.quiz_test_count ?? 0,
      lastQuizTestedAt: rs?.last_quiz_tested_at ? new Date(rs.last_quiz_tested_at) : null,
      quizStreak: rs?.quiz_streak ?? 0,
      pendingReveal: false,
      lastFailAt: null,
      lastFailSource: null,
      reviewFailCount: rs?.review_fail_count ?? 0,
      quizFailCount: rs?.quiz_fail_count ?? 0,
      knownAt: knownAt ? new Date(knownAt) : null,
    };
    const { score, bucket, bars } = computeOverallStrength(candidate, now);
    result[termId] = { termId, score, bucket, bars };
  }

  return result;
}

/** Flip user_progress only — queue outcomes go through review-outcome.
 *  Allowed when the term's collection is paused. */
export async function markTermKnown(client: Client, termId: string) {
  const { error } = await client.rpc("my_mark_term_known", {
    p_term_id: termId,
  });

  if (error) throw error;
}

/** Flip user_progress only — queue outcomes go through review-outcome. */
export async function markTermKnownForUser(client: Client, userId: string, termId: string) {
  const { error } = await client.rpc("mark_term_known", {
    p_user_id: userId,
    p_term_id: termId,
  });

  if (error) throw error;
}

/** Flip user_progress only — queue outcomes go through review-outcome. */
export async function clearTermKnown(client: Client, _userId: string, termId: string) {
  const { error } = await client.rpc("my_clear_term_known", {
    p_term_id: termId,
  });

  if (error) throw error;
}

/** Flip user_progress only — queue outcomes go through review-outcome. */
export async function clearTermKnownForUser(client: Client, userId: string, termId: string) {
  const { error } = await client.rpc("clear_term_known", {
    p_user_id: userId,
    p_term_id: termId,
  });

  if (error) throw error;
}

async function fetchReviewDomainIdsFromRpc(client: Client, userId: string) {
  const { data, error } = await client.rpc("review_domain_ids", {
    p_user_id: userId,
  });

  if (error) throw error;
  return data ?? [];
}

export async function resolveReviewDomainIds(client: Client, userId: string) {
  const [collectionRows, reviewDomainIds] = await Promise.all([
    fetchUserCollection(client, userId),
    client.rpc("my_review_domain_ids").then(({ data, error }) => {
      if (error) throw error;
      return data ?? [];
    }),
  ]);

  return { reviewDomainIds, collectionRows };
}

export async function resolveReviewDomainIdsForUser(client: Client, userId: string) {
  const [collectionRows, reviewDomainIds] = await Promise.all([
    fetchUserCollection(client, userId),
    fetchReviewDomainIdsFromRpc(client, userId),
  ]);

  return { reviewDomainIds, collectionRows };
}

export async function resetDomainProgress(client: Client, _userId: string, domainId: string) {
  const { error } = await client.rpc("my_reset_domain_progress", {
    p_domain_id: domainId,
  });

  if (error) throw error;
}
