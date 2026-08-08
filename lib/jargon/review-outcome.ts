/**
 * Shared review/quiz outcome rules for web + Telegram.
 * Sole writer of review_state outcomes — surfaces must not call outcome RPCs directly.
 * @see docs/smart-queue.md — "Surfaces"
 *
 * incrementSeen semantics (preserve intentionally):
 * - applyTermSeen / applyTermRead / applyKnownToggle mark-known → increment
 * - applyMarkKnown (Telegram after delivery) → no increment
 * - applyReviewRating after reveal → no second increment when alreadyCountedSeen
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
import type { ReviewOutcome, ReviewShownOrigin } from "@/lib/smart-queue";
import { recordReviewOutcome, recordReviewOutcomeForUser } from "@/lib/smart-queue/repository";

type Client = SupabaseClient<Database>;

export type TermPoolStatus = "known" | "unknown";

function mapAnswerToOutcome(status: TermPoolStatus, passed: boolean): ReviewOutcome {
  if (status === "unknown") {
    return passed ? "solid" : "learning";
  }
  return passed ? "verified" : "forgot";
}

function mapRatingToOutcome(sessionStatus: TermPoolStatus, known: boolean): ReviewOutcome {
  return mapAnswerToOutcome(sessionStatus, known);
}

type AuthMode = "session" | "admin";

async function writeOutcome(
  client: Client,
  mode: AuthMode,
  userId: string,
  termId: string,
  outcome: ReviewOutcome,
  incrementSeen: boolean,
  shownOrigin?: ReviewShownOrigin,
) {
  if (mode === "session") {
    await recordReviewOutcome(client, termId, outcome, incrementSeen, shownOrigin);
  } else {
    await recordReviewOutcomeForUser(client, userId, termId, outcome, incrementSeen, shownOrigin);
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

export type QuizAnswerResult = {
  outcome: ReviewOutcome;
  flipped: boolean;
};

/** Quiz answer: record outcome + optional known flip per quiz prefs. */
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

  const outcome = mapAnswerToOutcome(input.status, input.passed);
  await writeOutcome(client, mode, userId, input.termId, outcome, true);

  let flipped = false;

  if (!input.passed && markUnknownOnFail) {
    await flipKnown(client, mode, userId, input.termId, false);
    flipped = true;
  } else if (input.passed && input.status === "unknown" && markKnownOnPass) {
    await flipKnown(client, mode, userId, input.termId, true);
    flipped = true;
  }

  return { outcome, flipped };
}

/** Flashcard review rating: always flip known/unknown when rating changes state. */
export async function applyReviewRating(
  client: Client,
  userId: string,
  input: {
    termId: string;
    known: boolean;
    sessionStatus: TermPoolStatus;
    alreadyCountedSeen?: boolean;
    mode?: AuthMode;
  },
): Promise<{ outcome: ReviewOutcome }> {
  const mode = input.mode ?? "session";
  const incrementSeen = !input.alreadyCountedSeen;
  const outcome = mapRatingToOutcome(input.sessionStatus, input.known);

  await writeOutcome(client, mode, userId, input.termId, outcome, incrementSeen);

  if (input.sessionStatus === "unknown" && input.known) {
    await flipKnown(client, mode, userId, input.termId, true);
  } else if (input.sessionStatus === "known" && !input.known) {
    await flipKnown(client, mode, userId, input.termId, false);
  }

  return { outcome };
}

/**
 * Jargon-page / widget known toggle (list checkbox + desktop widget).
 * Mark known → solid (+increment). Mark unknown → forgot (no increment).
 */
export async function applyKnownToggle(
  client: Client,
  userId: string,
  termId: string,
  isKnown: boolean,
  mode: AuthMode = "session",
): Promise<void> {
  await flipKnown(client, mode, userId, termId, isKnown);
  if (isKnown) {
    await writeOutcome(client, mode, userId, termId, "solid", true);
  } else {
    await writeOutcome(client, mode, userId, termId, "forgot", false);
  }
}

/** Jargon-page browse: lightest tier, incidental exposure (+increment). */
export async function applyTermSeen(
  client: Client,
  userId: string,
  termId: string,
  mode: AuthMode = "session",
): Promise<void> {
  await writeOutcome(client, mode, userId, termId, "seen", true, "browse");
}

/** Read CTA, widget "Next", or Review reveal: deliberate but untested (+increment). */
export async function applyTermRead(
  client: Client,
  userId: string,
  termId: string,
  origin: Exclude<ReviewShownOrigin, "browse">,
  mode: AuthMode = "session",
): Promise<void> {
  await writeOutcome(client, mode, userId, termId, "read", true, origin);
}

/** Telegram /read "Mark known": mark + solid outcome, no seen increment. */
export async function applyMarkKnown(
  client: Client,
  userId: string,
  termId: string,
  mode: AuthMode = "admin",
): Promise<void> {
  await flipKnown(client, mode, userId, termId, true);
  await writeOutcome(client, mode, userId, termId, "solid", false);
}
