import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { selectDistractorsFromDomain } from "@/lib/quiz/distractors";
import type { TelegramAction } from "./actions";
import { NOTHING_ELIGIBLE_FOR_QUIZ_MESSAGE } from "./copy";
import {
  buildReviewKeyboard,
  formatIllustrationQuestion,
  formatReviewQuestion,
  formatReviewSummary,
} from "./presentation";
import {
  createSession,
  deleteSession,
  getCurrentTerm,
  getSession,
  type QuizDomainSelection,
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

  const currentTerm = await getCurrentTerm(client, session);
  if (!currentTerm) {
    return buildReviewSummaryActions(client, chatId, session);
  }

  const illustrationPick = session.illustration[currentTerm.id];
  if (illustrationPick) {
    return [
      send(
        chatId,
        formatIllustrationQuestion(
          session.currentIndex,
          session.termIds.length,
          illustrationPick.scenarioText,
        ),
        buildReviewKeyboard(
          illustrationPick.options.map((o) => ({ id: o.id, term: o.text })),
          session.currentIndex,
        ),
        true,
      ),
    ];
  }

  const distractors = await selectDistractorsFromDomain(
    client,
    currentTerm.id,
    currentTerm.domainId,
    3,
  );
  const options = [{ id: currentTerm.id, term: currentTerm.term }, ...distractors];
  const shuffled = options.sort(() => Math.random() - 0.5);

  return [
    send(
      chatId,
      formatReviewQuestion(currentTerm, session.currentIndex, session.termIds.length),
      buildReviewKeyboard(shuffled, session.currentIndex),
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

  const message = formatReviewSummary(session.correctCount, session.termIds.length);
  await deleteSession(client, chatId);
  return [send(chatId, message)];
}

export async function startReviewSession(
  client: Client,
  chatId: number,
  userId: string,
  domainId: QuizDomainSelection,
  count: number,
): Promise<TelegramAction[]> {
  const session = await createSession(client, chatId, userId, domainId, count);

  if (session.termIds.length === 0) {
    await deleteSession(client, chatId);
    return [send(chatId, NOTHING_ELIGIBLE_FOR_QUIZ_MESSAGE)];
  }

  return buildNextQuestionActions(client, chatId, session);
}

export { handleReviewAnswer } from "./quiz-answer-flow";
