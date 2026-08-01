/**
 * Shared review/quiz outcome rules for web + Telegram.
 * @see docs/smart-queue.md — "How surfaces couple in"
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
import type { ReviewOutcome } from "@/lib/smart-queue";
import { recordReviewOutcome, recordReviewOutcomeForUser } from "@/lib/smart-queue/service";

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
) {
  if (mode === "session") {
    await recordReviewOutcome(client, termId, outcome, incrementSeen);
  } else {
    await recordReviewOutcomeForUser(client, userId, termId, outcome, incrementSeen);
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
      await markTermKnown(client, termId, { recordQueue: false });
    } else {
      await markTermKnownForUser(client, userId, termId, { recordQueue: false });
    }
  } else if (mode === "session") {
    await clearTermKnown(client, userId, termId, { recordQueue: false });
  } else {
    await clearTermKnownForUser(client, userId, termId, { recordQueue: false });
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

/** Telegram /next "Mark known": mark + solid outcome, no seen increment. */
export async function applyMarkKnown(
  client: Client,
  userId: string,
  termId: string,
  mode: AuthMode = "admin",
): Promise<void> {
  if (mode === "session") {
    await markTermKnown(client, termId, { recordQueue: false });
  } else {
    await markTermKnownForUser(client, userId, termId, { recordQueue: false });
  }
  await writeOutcome(client, mode, userId, termId, "solid", false);
}

/** Telegram /next Skip: skipped outcome, no seen increment. */
export async function applySkip(
  client: Client,
  userId: string,
  termId: string,
  mode: AuthMode = "admin",
): Promise<void> {
  await writeOutcome(client, mode, userId, termId, "skipped", false);
}
