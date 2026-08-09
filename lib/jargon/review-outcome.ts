/**
 * Shared review/quiz outcome rules for web + Telegram.
 * Sole writer of review_state events — surfaces must not call the event RPCs directly.
 * @see docs/smart-queue.md — "Surfaces"
 *
 * Three writes, one per event shape:
 * - recordRead — Read page/command, jargon-page card open. Pure exposure.
 * - recordReveal — Review flashcard reveal. Marks pending_reveal, no test yet.
 * - recordTest — Review rating or quiz answer. The only writer of pass/fail
 *   history, scoped to whichever `activity` it's called with.
 *
 * Pool flips (known/unknown) are a separate, explicit call at each call
 * site — recordTest's only job is writing the test event. Review rating
 * always flips; quiz answers flip per Settings → Quiz prefs
 * (markUnknownOnFail/markKnownOnPass), same as before.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  clearTermKnown,
  clearTermKnownForUser,
  markTermKnown,
  markTermKnownForUser,
} from "@/lib/jargon/known-state";
import { getUserSettings } from "@/lib/llm/settings";
import type { ReviewEvent } from "@/lib/smart-queue";
import { recordReviewEvent, recordReviewEventForUser } from "@/lib/smart-queue/repository";

type Client = SupabaseClient<Database>;

export type TermPoolStatus = "known" | "unknown";
export type AuthMode = "session" | "admin";

async function writeEvent(
  client: Client,
  mode: AuthMode,
  userId: string,
  termId: string,
  event: ReviewEvent,
) {
  if (mode === "session") {
    await recordReviewEvent(client, termId, event);
  } else {
    await recordReviewEventForUser(client, userId, termId, event);
  }
}

async function flipKnown(
  client: Client,
  mode: AuthMode,
  userId: string,
  termId: string,
  toKnown: boolean,
) {
  if (toKnown) {
    if (mode === "session") {
      await markTermKnown(client, termId);
    } else {
      await markTermKnownForUser(client, userId, termId);
    }
  } else if (mode === "session") {
    await clearTermKnown(client, userId, termId);
  } else {
    await clearTermKnownForUser(client, userId, termId);
  }
}

/** Read page/command, `/read`, or opening a term card on the jargon page: deliberate but untested exposure. */
export async function recordRead(
  client: Client,
  userId: string,
  termId: string,
  mode: AuthMode = "session",
): Promise<void> {
  await writeEvent(client, mode, userId, termId, "read");
}

/** Review flashcard reveal: marks pending_reveal, cleared by the rating that follows. */
export async function recordReveal(
  client: Client,
  userId: string,
  termId: string,
  mode: AuthMode = "session",
): Promise<void> {
  await writeEvent(client, mode, userId, termId, "reveal");
}

export type RecordTestResult = {
  event: ReviewEvent;
};

/** Review rating or quiz answer — the only writer of pass/fail history, scoped by `activity`. */
export async function recordTest(
  client: Client,
  userId: string,
  input: {
    termId: string;
    activity: "review" | "quiz";
    passed: boolean;
    mode?: AuthMode;
  },
): Promise<RecordTestResult> {
  const mode = input.mode ?? "session";
  const event: ReviewEvent =
    input.activity === "review"
      ? input.passed
        ? "review_pass"
        : "review_fail"
      : input.passed
        ? "quiz_pass"
        : "quiz_fail";

  await writeEvent(client, mode, userId, input.termId, event);
  return { event };
}

export type QuizAnswerResult = {
  passed: boolean;
  flipped: boolean;
};

/** Quiz answer: record the test + optional known flip per Settings → Quiz prefs. */
export async function applyQuizAnswer(
  client: Client,
  userId: string,
  input: {
    termId: string;
    passed: boolean;
    status: TermPoolStatus;
    mode?: AuthMode;
  },
): Promise<QuizAnswerResult> {
  const mode = input.mode ?? "session";
  const settings = await getUserSettings(client, userId);
  const markUnknownOnFail = settings?.markUnknownOnFail ?? true;
  const markKnownOnPass = settings?.markKnownOnPass ?? false;

  await recordTest(client, userId, {
    termId: input.termId,
    activity: "quiz",
    passed: input.passed,
    mode,
  });

  let flipped = false;

  if (!input.passed && markUnknownOnFail) {
    await flipKnown(client, mode, userId, input.termId, false);
    flipped = true;
  } else if (input.passed && input.status === "unknown" && markKnownOnPass) {
    await flipKnown(client, mode, userId, input.termId, true);
    flipped = true;
  }

  return { passed: input.passed, flipped };
}

/** Flashcard review rating: always flip known/unknown when rating changes state. */
export async function applyReviewRating(
  client: Client,
  userId: string,
  input: {
    termId: string;
    known: boolean;
    sessionStatus: TermPoolStatus;
    mode?: AuthMode;
  },
): Promise<{ passed: boolean }> {
  const mode = input.mode ?? "session";

  await recordTest(client, userId, {
    termId: input.termId,
    activity: "review",
    passed: input.known,
    mode,
  });

  if (input.sessionStatus === "unknown" && input.known) {
    await flipKnown(client, mode, userId, input.termId, true);
  } else if (input.sessionStatus === "known" && !input.known) {
    await flipKnown(client, mode, userId, input.termId, false);
  }

  return { passed: input.known };
}

/**
 * Widget "Mark known" / Telegram "Mark known": a self-graded Review pass —
 * you're confirming you know it, which is a judgment, not passive exposure.
 */
export async function applyKnownToggle(
  client: Client,
  userId: string,
  termId: string,
  isKnown: boolean,
  mode: AuthMode = "session",
): Promise<void> {
  await flipKnown(client, mode, userId, termId, isKnown);
  await recordTest(client, userId, { termId, activity: "review", passed: isKnown, mode });
}

/**
 * Jargon-page term-card toggle (known/unknown). Incidental self-report while
 * browsing, not a tested recall — pool flip only, no review_state write.
 */
export async function setKnownStatus(
  client: Client,
  userId: string,
  termId: string,
  isKnown: boolean,
  mode: AuthMode = "session",
): Promise<void> {
  await flipKnown(client, mode, userId, termId, isKnown);
}
