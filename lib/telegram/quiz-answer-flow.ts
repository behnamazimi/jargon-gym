import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { applyQuizAnswer } from "@/lib/jargon/review-outcome";
import { NONE_OF_THESE_OPTION_TEXT } from "@/lib/quiz/illustration";
import type { TelegramAction } from "./actions";
import {
  formatIllustrationQuestionWithAnswer,
  formatReviewQuestionWithAnswer,
} from "./presentation";
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

async function lookupTermName(client: Client, termId: string): Promise<string> {
  const { data } = await client.from("terms").select("term").eq("id", termId).single();
  return data?.term ?? "Unknown";
}

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

  const illustrationPick = session.illustration[currentTerm.id];

  let isCorrect: boolean;
  let selectedLabel: string;
  let correctLabel: string;

  if (illustrationPick) {
    isCorrect = selectedTermId === illustrationPick.correctOptionId;
    // Both labels come from the pick's own options — the same list already
    // sent to the user in the keyboard — rather than a DB lookup, since that
    // list already covers every id the user could have tapped, including
    // the "none" sentinel.
    correctLabel =
      illustrationPick.options.find((o) => o.id === illustrationPick.correctOptionId)?.text ??
      NONE_OF_THESE_OPTION_TEXT;
    selectedLabel =
      illustrationPick.options.find((o) => o.id === selectedTermId)?.text ?? "Unknown";
  } else {
    isCorrect = selectedTermId === currentTerm.id;
    correctLabel = currentTerm.term;
    selectedLabel = await lookupTermName(client, selectedTermId);
  }

  await applyQuizAnswer(client, session.userId, {
    termId: currentTerm.id,
    passed: isCorrect,
    questionType: "multiple_choice",
    mode: "admin",
  });

  const message = illustrationPick
    ? formatIllustrationQuestionWithAnswer(
        sessionIndex,
        session.termIds.length,
        illustrationPick.scenarioText,
        selectedLabel,
        correctLabel,
        isCorrect,
        session.correctCount + (isCorrect ? 1 : 0),
      )
    : formatReviewQuestionWithAnswer(
        currentTerm,
        sessionIndex,
        session.termIds.length,
        selectedLabel,
        isCorrect,
        session.correctCount + (isCorrect ? 1 : 0),
      );

  return finishAnsweredQuestion(client, chatId, messageId, session, isCorrect, message);
}
