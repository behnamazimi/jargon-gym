/** Trace-queue event-recording RPCs. Internal — only lib/jargon/review-outcome.ts should call these. */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ReviewEvent } from "./types";

type Client = SupabaseClient<Database>;

export type TraceEventPayload = {
  recallStability?: number;
  recallDifficulty?: number;
  quizKnowledgePosterior?: number;
  /** Set when this event's post-event Mastery_adjusted crosses the known
   *  threshold — drives the ever_mastered_at high-water mark (doc §8). SQL
   *  only sets it once and never clears it; the threshold itself lives in
   *  lib/trace, not duplicated here. */
  crossedKnownThreshold?: boolean;
  /** Set when this event's post-event Mastery_adjusted crosses the learning
   *  threshold — drives the ever_learning_at high-water mark, sibling of
   *  crossedKnownThreshold at the lower (0.6) bound. SQL only sets it once
   *  and never clears it. */
  crossedLearningThreshold?: boolean;
  /** 1-4 (AGAIN/HARD/GOOD/EASY) — review_pass/review_fail only, logged to review_events. */
  grade?: number;
  /** quiz_pass/quiz_fail only, logged to review_events. */
  questionType?: "multiple_choice" | "true_false";
  /** Recall/recognition retrievability just before this event — review_pass/fail and
   *  quiz_pass/fail only, logged to review_events for calibration checking. */
  retrievabilityBefore?: number;
};

function toEventRpcRecallFields(payload?: TraceEventPayload) {
  return {
    p_recall_stability: payload?.recallStability,
    p_recall_difficulty: payload?.recallDifficulty,
    p_quiz_knowledge_posterior: payload?.quizKnowledgePosterior,
    p_crossed_known_threshold: payload?.crossedKnownThreshold ?? false,
  };
}

function toEventRpcOutcomeFields(payload?: TraceEventPayload) {
  return {
    p_grade: payload?.grade,
    p_question_type: payload?.questionType,
    p_retrievability_before: payload?.retrievabilityBefore,
    p_crossed_learning_threshold: payload?.crossedLearningThreshold ?? false,
  };
}

function toEventRpcFields(payload?: TraceEventPayload) {
  return {
    ...toEventRpcRecallFields(payload),
    ...toEventRpcOutcomeFields(payload),
  };
}

export async function recordTraceEvent(
  client: Client,
  termId: string,
  event: ReviewEvent,
  payload?: TraceEventPayload,
): Promise<void> {
  const { error } = await client.rpc("my_record_review_event", {
    p_term_id: termId,
    p_event: event,
    ...toEventRpcFields(payload),
  });

  if (error) throw error;
}

export async function recordTraceEventForUser(
  client: Client,
  userId: string,
  termId: string,
  event: ReviewEvent,
  payload?: TraceEventPayload,
): Promise<void> {
  const { error } = await client.rpc("record_review_event", {
    p_user_id: userId,
    p_term_id: termId,
    p_event: event,
    ...toEventRpcFields(payload),
  });

  if (error) throw error;
}

export async function bumpStreak(client: Client): Promise<void> {
  const { error } = await client.rpc("my_bump_streak");

  if (error) throw error;
}

export async function bumpStreakForUser(client: Client, userId: string): Promise<void> {
  const { error } = await client.rpc("bump_streak", {
    p_user_id: userId,
  });

  if (error) throw error;
}
