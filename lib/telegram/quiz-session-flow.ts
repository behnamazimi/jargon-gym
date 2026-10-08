import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TelegramAction } from "./actions";
import { NOTHING_ELIGIBLE_FOR_QUIZ_MESSAGE } from "./copy";
import { buildQuizKeyboard, formatQuizQuestion, formatReviewSummary } from "./presentation";
import {
  createSession,
  deleteSession,
  getCurrentQuestion,
  getSession,
  type QuizCollectionSelection,
  type ReviewSession,
} from "./session-store";
import { send } from "./transport";

type Client = SupabaseClient<Database>;

/** `knownSession` lets a caller that just mutated the session (answer) pass
 *  it straight through instead of re-reading it back from storage. */
export async function buildNextQuestionActions(
  client: Client,
  chatId: number,
  knownSession?: ReviewSession,
): Promise<TelegramAction[]> {
  const session = knownSession ?? (await getSession(client, chatId));
  if (!session) {
    return [send(chatId, "Your quiz session has expired. Start a new one with /quiz")];
  }

  const question = getCurrentQuestion(session);
  if (!question) {
    return buildReviewSummaryActions(client, chatId, session);
  }

  return [
    send(
      chatId,
      formatQuizQuestion(question, session.currentIndex, session.questions.length),
      buildQuizKeyboard(question, session.currentIndex),
      true,
    ),
  ];
}

export async function buildReviewSummaryActions(
  client: Client,
  chatId: number,
  knownSession?: ReviewSession,
): Promise<TelegramAction[]> {
  const session = knownSession ?? (await getSession(client, chatId));
  if (!session) return [];

  const message = formatReviewSummary(session.correctCount, session.questions.length);
  await deleteSession(client, chatId);
  return [send(chatId, message)];
}

export async function startReviewSession(
  client: Client,
  chatId: number,
  userId: string,
  collectionId: QuizCollectionSelection,
  count: number,
): Promise<TelegramAction[]> {
  const session = await createSession(client, chatId, userId, collectionId, count);

  if (session.questions.length === 0) {
    await deleteSession(client, chatId);
    return [send(chatId, NOTHING_ELIGIBLE_FOR_QUIZ_MESSAGE)];
  }

  return buildNextQuestionActions(client, chatId, session);
}

export { handleReviewAnswer } from "./quiz-answer-flow";
