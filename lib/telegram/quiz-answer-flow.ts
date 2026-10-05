import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { applyQuizAnswer } from "@/lib/terms/review-outcome";
import { gradeAnswer } from "@/lib/quiz/grade";
import { traceQuestionType } from "@/lib/quiz/trace-type";
import type { TelegramAction } from "./actions";
import { formatQuizQuestionWithAnswer } from "./presentation";
import { correctOption, quizOptions } from "./quiz-options";
import { buildNextQuestionActions, buildReviewSummaryActions } from "./quiz-session-flow";
import {
  getCurrentQuestion,
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
    actions.push(...(await buildNextQuestionActions(client, chatId, updatedSession)));
  } else {
    actions.push({ type: "pause", chatId, ms: 1000 });
    actions.push(...(await buildReviewSummaryActions(client, chatId, updatedSession)));
  }

  return actions;
}

export async function handleReviewAnswer(
  client: Client,
  chatId: number,
  messageId: number,
  sessionIndex: number,
  selectedOptionId: string,
): Promise<TelegramAction[]> {
  const session = await getSession(client, chatId);
  if (!session) {
    return [send(chatId, "Your quiz session has expired. Start a new one with /quiz")];
  }

  if (sessionIndex !== session.currentIndex) {
    return [send(chatId, "This question has already been answered.")];
  }

  const question = getCurrentQuestion(session);
  if (!question) return [];

  const selected = quizOptions(question).find((option) => option.id === selectedOptionId);
  if (!selected) return [];

  const isCorrect = gradeAnswer(question, selected.response);

  await applyQuizAnswer(client, session.userId, {
    termId: question.termId,
    passed: isCorrect,
    questionType: traceQuestionType(question),
    mode: "admin",
  });

  const message = formatQuizQuestionWithAnswer(
    question,
    sessionIndex,
    session.questions.length,
    selected.label,
    correctOption(question)?.label ?? "",
    isCorrect,
    session.correctCount + (isCorrect ? 1 : 0),
  );

  return finishAnsweredQuestion(client, chatId, messageId, session, isCorrect, message);
}
