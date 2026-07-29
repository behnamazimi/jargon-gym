import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  buildReviewKeyboard,
  formatReviewQuestion,
  formatReviewResult,
  formatReviewSummary,
  sendMessage,
  editMessageText,
} from "./telegram-api.ts";
import {
  NO_KNOWN_TERMS_MESSAGE,
  NO_UNKNOWN_TERMS_MESSAGE,
  QUIZ_HELP_MESSAGE,
} from "./constants.ts";
import {
  createSession,
  deleteSession,
  getCurrentTerm,
  getSession,
  hasMoreQuestions,
  updateSession,
  type ReviewStatus,
} from "./review-session.ts";
import { selectDistractors } from "./distractor-service.ts";

/**
 * Start a new quiz session
 */
export async function startReviewSession(
  supabase: SupabaseClient,
  chatId: number,
  userId: string,
  status: ReviewStatus,
  count: number,
): Promise<void> {
  const session = await createSession(supabase, chatId, userId, status, count);

  if (session.termIds.length === 0) {
    const message = status === "unknown" ? NO_UNKNOWN_TERMS_MESSAGE : NO_KNOWN_TERMS_MESSAGE;
    await sendMessage(chatId, message);
    await deleteSession(supabase, chatId);
    return;
  }

  await sendNextReviewQuestion(supabase, chatId);
}

/**
 * Send the next question in the quiz session
 */
export async function sendNextReviewQuestion(
  supabase: SupabaseClient,
  chatId: number,
): Promise<void> {
  const session = await getSession(supabase, chatId);
  if (!session) {
    await sendMessage(chatId, "Your quiz session has expired. Start a new one with /quiz");
    return;
  }

  const currentTerm = await getCurrentTerm(supabase, session);
  if (!currentTerm) {
    await sendReviewSummary(supabase, chatId);
    return;
  }

  const distractors = await selectDistractors(supabase, currentTerm.id, currentTerm.domain_id, 3);
  const options = [{ id: currentTerm.id, term: currentTerm.term }, ...distractors];
  const shuffled = options.sort(() => Math.random() - 0.5);

  const message = formatReviewQuestion(currentTerm, session.currentIndex, session.termIds.length);
  const keyboard = buildReviewKeyboard(shuffled, session.currentIndex);
  await sendMessage(chatId, message, keyboard);
}

/**
 * Handle a quiz answer callback
 */
export async function handleReviewAnswer(
  supabase: SupabaseClient,
  chatId: number,
  messageId: number,
  sessionIndex: number,
  selectedTermId: string,
): Promise<void> {
  const session = await getSession(supabase, chatId);
  if (!session) {
    await sendMessage(chatId, "Your quiz session has expired. Start a new one with /quiz");
    return;
  }

  if (sessionIndex !== session.currentIndex) {
    await sendMessage(chatId, "This question has already been answered.");
    return;
  }

  const currentTerm = await getCurrentTerm(supabase, session);
  if (!currentTerm) {
    return;
  }

  const isCorrect = selectedTermId === currentTerm.id;

  const { data: selectedTermData } = await supabase
    .from("terms")
    .select("term")
    .eq("id", selectedTermId)
    .single();

  const selectedTermName = selectedTermData?.term ?? "Unknown";

  const updatedSession = await updateSession(supabase, chatId, session, isCorrect);

  const resultMessage = formatReviewResult(
    isCorrect,
    currentTerm.term,
    selectedTermName,
    updatedSession.correctCount,
    updatedSession.termIds.length,
  );

  await editMessageText(chatId, messageId, resultMessage, { inline_keyboard: [] });

  if (hasMoreQuestions(updatedSession)) {
    await delay(1500);
    await sendNextReviewQuestion(supabase, chatId);
  } else {
    await delay(1000);
    await sendReviewSummary(supabase, chatId);
  }
}

/**
 * Send quiz session summary
 */
export async function sendReviewSummary(supabase: SupabaseClient, chatId: number): Promise<void> {
  const session = await getSession(supabase, chatId);
  if (!session) {
    return;
  }

  const message = formatReviewSummary(session.correctCount, session.termIds.length, session.status);

  await sendMessage(chatId, message);
  await deleteSession(supabase, chatId);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse quiz command parameters
 */
export function parseReviewCommand(text: string): {
  status: ReviewStatus;
  count: number | "all";
  error: string | null;
} {
  let status: ReviewStatus = "unknown";
  let count: number | "all" = 5;

  const match = text.match(/^\/quiz(?:@\w+)?(?:\s+(.+))?$/i);
  const argsText = match?.[1]?.trim() ?? "";

  if (!argsText) {
    return { status, count, error: null };
  }

  const args = argsText.split(/\s+/);
  const firstArg = args[0].toLowerCase();

  if (firstArg === "known" || firstArg === "unknown") {
    status = firstArg;

    if (args.length > 1) {
      const secondArg = args[1].toLowerCase();
      if (secondArg === "all") {
        count = "all";
      } else {
        const parsed = parseInt(secondArg, 10);
        if (isNaN(parsed) || parsed < 1) {
          return {
            status,
            count: 5,
            error: "Invalid count. Using default (5).",
          };
        }
        count = parsed;
      }
    }
  } else if (firstArg === "all") {
    count = "all";
  } else {
    const parsed = parseInt(firstArg, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      count = parsed;
    } else {
      return {
        status: "unknown",
        count: 5,
        error: QUIZ_HELP_MESSAGE,
      };
    }
  }

  return { status, count, error: null };
}

/**
 * Get the actual count for "all" based on available terms
 */
export async function resolveReviewCount(
  supabase: SupabaseClient,
  userId: string,
  status: ReviewStatus,
  requestedCount: number | "all",
): Promise<number> {
  if (requestedCount !== "all") {
    return requestedCount;
  }

  const { data, error } = await supabase.rpc(
    status === "unknown" ? "count_unknown_terms" : "count_known_terms",
    { p_user_id: userId },
  );

  if (error) {
    console.error("Error counting terms:", error);
    return 5;
  }

  return Math.min(Number(data ?? 5), 50);
}
