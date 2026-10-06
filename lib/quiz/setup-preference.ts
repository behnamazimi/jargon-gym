import {
  isCollectionPreference,
  resolveStudyCollectionId,
  writePreferenceCookie,
} from "@/lib/study/collection-preference";
import { MAX_STUDY_TERMS } from "@/lib/study/types";
import type { QuizQuestionStyle } from "./types";

export const QUIZ_SETUP_COOKIE = "lb-quiz-setup";

export const DEFAULT_QUIZ_QUESTION_COUNT = 10;

/** `count` is only stored once the user picks one; until then every
 *  collection opens on the default. */
export type SavedQuizSetup = {
  style: QuizQuestionStyle;
  count?: number;
  collectionId?: string;
};

export type InitialQuizSetup = {
  style: QuizQuestionStyle;
  collectionId: string;
  count: number | null;
  savedCollectionId: string | null;
  /** The collection came from a `?domain=` link, not from the picker. */
  collectionFromLink: boolean;
  /** They last used AI quizzes but AI isn't available now, so we opened on Simple. */
  aiFellBack: boolean;
};

function isValidCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= MAX_STUDY_TERMS;
}

export function parseQuizSetupCookie(value: string | undefined): SavedQuizSetup | null {
  if (!value) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeURIComponent(value));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const record = parsed as Record<string, unknown>;
  if (record.style !== "simple" && record.style !== "ai") return null;

  const setup: SavedQuizSetup = { style: record.style };
  if (isValidCount(record.count)) setup.count = record.count;
  if (isCollectionPreference(record.collectionId)) setup.collectionId = record.collectionId;
  return setup;
}

export function saveQuizSetupPreference(setup: SavedQuizSetup): void {
  writePreferenceCookie(QUIZ_SETUP_COOKIE, JSON.stringify(setup));
}

export function resolveInitialQuizSetup(input: {
  saved: SavedQuizSetup | null;
  domainParam: string | undefined;
  activeIds: string[];
  aiAvailable: boolean;
}): InitialQuizSetup {
  const { saved, domainParam, activeIds, aiAvailable } = input;
  const savedCollectionId = saved?.collectionId ?? null;
  const wantedAi = saved?.style === "ai";

  return {
    // An AI quiz can't start without a key or credits, so don't open on it.
    style: wantedAi && aiAvailable ? "ai" : "simple",
    aiFellBack: wantedAi && !aiAvailable,
    collectionId: resolveStudyCollectionId(domainParam, savedCollectionId, activeIds),
    count: saved?.count ?? null,
    savedCollectionId,
    collectionFromLink: Boolean(domainParam && activeIds.includes(domainParam)),
  };
}

/** The user's count capped to what the collection has, else the default
 *  (also capped). Never below 1 so the field always shows a number. */
export function questionCountFor(preferred: number | null, max: number): number {
  if (max <= 0) return 1;
  return Math.min(preferred ?? DEFAULT_QUIZ_QUESTION_COUNT, max);
}

/** What to remember when a quiz starts. A collection that arrived via a
 *  link (e.g. the Library's Quiz button) and wasn't changed is a one-off,
 *  so the previously remembered collection is kept. */
export function quizSetupToSave(input: {
  style: QuizQuestionStyle;
  preferredCount: number | null;
  selectedCollectionId: string;
  collectionChanged: boolean;
  initial: InitialQuizSetup;
}): SavedQuizSetup {
  const { initial } = input;
  const collectionId =
    initial.collectionFromLink && !input.collectionChanged
      ? initial.savedCollectionId
      : input.selectedCollectionId;

  const setup: SavedQuizSetup = { style: input.style };
  if (input.preferredCount !== null) setup.count = input.preferredCount;
  if (collectionId) setup.collectionId = collectionId;
  return setup;
}
