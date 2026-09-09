import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { applyQuizAnswer } from "@/lib/jargon/review-outcome";
import type { TelegramAction } from "./actions";
import { formatReviewQuestionWithAnswer, formatTrueFalseQuestionWithAnswer } from "./presentation";
import { buildNextQuestionActions, buildReviewSummaryActions } from "./quiz-session-flow";
import {
  getCurrentTerm,
  getSession,
  hasMoreQuestions,
  updateSession,
  type ReviewSession,
} from "./session-store";
import { edit, send } from "./transport";

type Client = SupabaseClient<Database>;

/** Shared tail for both answer handlers: persist the outcome, show the
 *  answered-question message, then either advance or wrap up the session. */
async function finishAnsweredQuestion(
  client: Client,
  chatId: number,
  messageId: number,
  session: ReviewSession,
  isCorrect: boolean,
  answeredMessage: string,
): Promise<TelegramAction[]> {
  const updatedSession = await updateSession(client, chatId, session, isCorrect);

  const actions: TelegramAction[] = [edit(chatId, messageId, answeredMessage)];

  if (hasMoreQuestions(updatedSession)) {
    actions.push({ type: "pause", chatId, ms: 1500 });
    actions.push(...(await buildNextQuestionActions(client, chatId)));
  } else {
    actions.push({ type: "pause", chatId, ms: 1000 });
    actions.push(...(await buildReviewSummaryActions(client, chatId)));
  }

  return actions;
}

export async function handleReviewAnswer(
  client: Client,
  chatId: number,
  messageId: number,
  sessionIndex: number,
  selectedTermId: string,
): Promise<TelegramAction[]> {
  const session = await getSession(client, chatId);
  if (!session) {
    return [send(chatId, "Your quiz session has expired. Start a new one with /quiz")];
  }

  if (sessionIndex !== session.currentIndex) {
    return [send(chatId, "This question has already been answered.")];
  }

  const currentTerm = await getCurrentTerm(client, session);
  if (!currentTerm) return [];

  const isCorrect = selectedTermId === currentTerm.id;

  const { data: selectedTermData } = await client
    .from("terms")
    .select("term")
    .eq("id", selectedTermId)
    .single();

  const selectedTermName = selectedTermData?.term ?? "Unknown";

  await applyQuizAnswer(client, session.userId, {
    termId: currentTerm.id,
    passed: isCorrect,
    questionType: "multiple_choice",
    mode: "admin",
  });

  const message = formatReviewQuestionWithAnswer(
    currentTerm,
    sessionIndex,
    session.termIds.length,
    selectedTermName,
    isCorrect,
    session.correctCount + (isCorrect ? 1 : 0),
  );

  return finishAnsweredQuestion(client, chatId, messageId, session, isCorrect, message);
}

export async function handleReviewTrueFalseAnswer(
  client: Client,
  chatId: number,
  messageId: number,
  sessionIndex: number,
  answer: boolean,
): Promise<TelegramAction[]> {
  const session = await getSession(client, chatId);
  if (!session) {
    return [send(chatId, "Your quiz session has expired. Start a new one with /quiz")];
  }

  if (sessionIndex !== session.currentIndex) {
    return [send(chatId, "This question has already been answered.")];
  }

  const currentTerm = await getCurrentTerm(client, session);
  if (!currentTerm) return [];

  const exampleJudgment = session.exampleJudgment[currentTerm.id];
  if (!exampleJudgment) return [];

  const isCorrect = answer === exampleJudgment.correctAnswer;

  await applyQuizAnswer(client, session.userId, {
    termId: currentTerm.id,
    passed: isCorrect,
    questionType: "true_false",
    mode: "admin",
  });

  const message = formatTrueFalseQuestionWithAnswer(
    currentTerm,
    sessionIndex,
    session.termIds.length,
    exampleJudgment.text,
    answer,
    exampleJudgment.correctAnswer,
    isCorrect,
    session.correctCount + (isCorrect ? 1 : 0),
  );

  return finishAnsweredQuestion(client, chatId, messageId, session, isCorrect, message);
}
