import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  buildQuizCollectionKeyboard,
  buildQuizCountKeyboard,
  buildQuizStatusKeyboard,
  buildReviewKeyboard,
  formatReviewQuestion,
  formatReviewQuestionWithAnswer,
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
  clearQuizSetup,
  loadQuizSetup,
  saveQuizSetup,
  type QuizDomainSelection,
} from "./quiz-setup.ts";
import {
  clearTermKnown,
  countTermsForQuiz,
  createSession,
  DEFAULT_TELEGRAM_QUIZ_COUNT,
  deleteSession,
  getCurrentTerm,
  getMaxQuizQuestionCount,
  getSession,
  hasMoreQuestions,
  updateSession,
  type ReviewStatus,
} from "./review-session.ts";
import { selectDistractors } from "./distractor-service.ts";
import { fetchCollectionStats } from "./term-service.ts";

export type ParsedQuizCommand = {
  status?: ReviewStatus;
  domainId?: QuizDomainSelection;
  count?: number | "all";
  complete: boolean;
  error: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function handleQuizCommand(
  supabase: SupabaseClient,
  chatId: number,
  userId: string,
  text: string,
): Promise<void> {
  const parsed = parseQuizCommand(text);

  if (parsed.error) {
    await sendMessage(chatId, parsed.error);
    return;
  }

  if (!parsed.complete) {
    await startQuizSetup(supabase, chatId, userId, parsed);
    return;
  }

  const count = await resolveQuizCount(
    supabase,
    userId,
    parsed.status!,
    parsed.domainId!,
    parsed.count ?? DEFAULT_TELEGRAM_QUIZ_COUNT,
  );

  await clearQuizSetup(supabase, chatId);
  await startReviewSession(supabase, chatId, userId, parsed.status!, parsed.domainId!, count);
}

async function startQuizSetup(
  supabase: SupabaseClient,
  chatId: number,
  userId: string,
  parsed: ParsedQuizCommand,
): Promise<void> {
  const startedAt = Date.now();

  if (!parsed.status) {
    await saveQuizSetup(supabase, chatId, { step: "status", startedAt });
    await sendStatusQuestion(supabase, chatId);
    return;
  }

  if (!parsed.domainId) {
    await saveQuizSetup(supabase, chatId, {
      step: "collection",
      status: parsed.status,
      startedAt,
    });
    await sendCollectionQuestion(supabase, chatId, userId, parsed.status);
    return;
  }

  await saveQuizSetup(supabase, chatId, {
    step: "count",
    status: parsed.status,
    domainId: parsed.domainId,
    startedAt,
  });
  await sendCountQuestion(supabase, chatId, userId, parsed.status, parsed.domainId);
}

async function sendStatusQuestion(supabase: SupabaseClient, chatId: number): Promise<void> {
  await sendMessage(
    chatId,
    "<b>What to quiz?</b>\n\nChoose unknown terms you're learning, or known terms to review.",
    buildQuizStatusKeyboard(),
    supabase,
  );
}

async function sendCollectionQuestion(
  supabase: SupabaseClient,
  chatId: number,
  userId: string,
  status: ReviewStatus,
): Promise<void> {
  const stats = await fetchCollectionStats(supabase, userId);
  const activeCollections = stats.filter((collection) => collection.isActive);

  if (activeCollections.length === 0) {
    await sendMessage(
      chatId,
      "You have no active collections in your review pool. Turn one on in the app first.",
    );
    await clearQuizSetup(supabase, chatId);
    return;
  }

  const collections = activeCollections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    count:
      status === "known" ? collection.knownCount : collection.totalCount - collection.knownCount,
  }));

  const allCount = collections.reduce((total, collection) => total + collection.count, 0);

  await sendMessage(
    chatId,
    "<b>Which collection?</b>\n\nNumbers show available terms for your selection.",
    buildQuizCollectionKeyboard(collections, allCount),
    supabase,
  );
}

async function sendCountQuestion(
  supabase: SupabaseClient,
  chatId: number,
  userId: string,
  status: ReviewStatus,
  domainId: QuizDomainSelection,
): Promise<void> {
  const available = await countTermsForQuiz(supabase, userId, status, domainId);
  const maxCount = getMaxQuizQuestionCount(available);

  if (maxCount === 0) {
    const message = status === "unknown" ? NO_UNKNOWN_TERMS_MESSAGE : NO_KNOWN_TERMS_MESSAGE;
    await sendMessage(chatId, message);
    await clearQuizSetup(supabase, chatId);
    return;
  }

  const defaultCount = Math.min(DEFAULT_TELEGRAM_QUIZ_COUNT, maxCount);

  await sendMessage(
    chatId,
    `<b>How many questions?</b>\n\n` +
      `Reply with a number from 1 to ${maxCount}, tap a button, or send nothing for ${defaultCount}.`,
    buildQuizCountKeyboard(maxCount),
    supabase,
  );
}

export async function handleQuizSetupCallback(
  supabase: SupabaseClient,
  chatId: number,
  userId: string,
  data: string,
): Promise<void> {
  const parts = data.slice("quizsetup:".length).split(":");
  const action = parts[0];

  if (action === "status") {
    const status = parts[1] as ReviewStatus;
    if (status !== "known" && status !== "unknown") return;

    await saveQuizSetup(supabase, chatId, {
      step: "collection",
      status,
      startedAt: Date.now(),
    });
    await sendCollectionQuestion(supabase, chatId, userId, status);
    return;
  }

  if (action === "domain") {
    const setup = await loadQuizSetup(supabase, chatId);
    if (!setup?.status) return;

    const domainToken = parts.slice(1).join(":");
    const domainId: QuizDomainSelection = domainToken === "all" ? "all" : domainToken;

    if (domainId !== "all" && !UUID_RE.test(domainId)) return;

    await saveQuizSetup(supabase, chatId, {
      step: "count",
      status: setup.status,
      domainId,
      startedAt: Date.now(),
    });
    await sendCountQuestion(supabase, chatId, userId, setup.status, domainId);
    return;
  }

  if (action === "count") {
    const setup = await loadQuizSetup(supabase, chatId);
    if (!setup?.status || !setup.domainId) return;

    const countToken = parts[1];
    let count: number;

    if (countToken === "all") {
      count = await resolveQuizCount(supabase, userId, setup.status, setup.domainId, "all");
    } else {
      count = parseInt(countToken, 10);
      if (isNaN(count) || count < 1) return;
    }

    await clearQuizSetup(supabase, chatId);
    await startReviewSession(supabase, chatId, userId, setup.status, setup.domainId, count);
  }
}

export async function handleQuizSetupText(
  supabase: SupabaseClient,
  chatId: number,
  userId: string,
  text: string,
): Promise<boolean> {
  const setup = await loadQuizSetup(supabase, chatId);
  if (!setup || setup.step !== "count" || !setup.status || !setup.domainId) {
    return false;
  }

  const trimmed = text.trim();
  if (trimmed.startsWith("/")) {
    return false;
  }

  let count: number;

  if (trimmed === "") {
    const available = await countTermsForQuiz(supabase, userId, setup.status, setup.domainId);
    count = Math.min(DEFAULT_TELEGRAM_QUIZ_COUNT, getMaxQuizQuestionCount(available));
  } else if (trimmed.toLowerCase() === "all") {
    count = await resolveQuizCount(supabase, userId, setup.status, setup.domainId, "all");
  } else {
    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed) || parsed < 1) {
      await sendMessage(chatId, "Send a valid number, tap a button, or /quiz to start over.");
      return true;
    }

    const maxCount = getMaxQuizQuestionCount(
      await countTermsForQuiz(supabase, userId, setup.status, setup.domainId),
    );

    if (parsed > maxCount) {
      await sendMessage(chatId, `Maximum for this selection is ${maxCount}. Try again.`);
      return true;
    }

    count = parsed;
  }

  await clearQuizSetup(supabase, chatId);
  await startReviewSession(supabase, chatId, userId, setup.status, setup.domainId, count);

  return true;
}

export async function startReviewSession(
  supabase: SupabaseClient,
  chatId: number,
  userId: string,
  status: ReviewStatus,
  domainId: QuizDomainSelection,
  count: number,
): Promise<void> {
  const session = await createSession(supabase, chatId, userId, status, domainId, count);

  if (session.termIds.length === 0) {
    const message = status === "unknown" ? NO_UNKNOWN_TERMS_MESSAGE : NO_KNOWN_TERMS_MESSAGE;
    await sendMessage(chatId, message);
    await deleteSession(supabase, chatId);
    return;
  }

  await sendNextReviewQuestion(supabase, chatId);
}

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
  await sendMessage(chatId, message, keyboard, supabase);
}

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

  if (!isCorrect) {
    await clearTermKnown(supabase, session.userId, currentTerm.id);
  }

  const updatedSession = await updateSession(supabase, chatId, session, isCorrect);

  const resultMessage = formatReviewQuestionWithAnswer(
    currentTerm,
    sessionIndex,
    updatedSession.termIds.length,
    selectedTermName,
    isCorrect,
    updatedSession.correctCount,
    !isCorrect,
  );

  await editMessageText(chatId, messageId, resultMessage, { inline_keyboard: [] }, supabase);

  if (hasMoreQuestions(updatedSession)) {
    await delay(1500);
    await sendNextReviewQuestion(supabase, chatId);
  } else {
    await delay(1000);
    await sendReviewSummary(supabase, chatId);
  }
}

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

export function parseQuizCommand(text: string): ParsedQuizCommand {
  const match = text.match(/^\/quiz(?:@\w+)?(?:\s+(.+))?$/i);
  const argsText = match?.[1]?.trim() ?? "";

  if (!argsText) {
    return { complete: false, error: null };
  }

  const args = argsText.split(/\s+/);
  const firstArg = args[0].toLowerCase();

  if (/^\d+$/.test(firstArg)) {
    const count = parseInt(firstArg, 10);
    if (isNaN(count) || count < 1) {
      return { complete: false, error: "Invalid count." };
    }
    return {
      status: "unknown",
      domainId: "all",
      count,
      complete: true,
      error: null,
    };
  }

  if (firstArg === "all" && args.length === 1) {
    return {
      status: "unknown",
      domainId: "all",
      count: "all",
      complete: true,
      error: null,
    };
  }

  if (firstArg !== "known" && firstArg !== "unknown") {
    return { complete: false, error: QUIZ_HELP_MESSAGE };
  }

  const status = firstArg as ReviewStatus;

  if (args.length === 1) {
    return { status, complete: false, error: null };
  }

  const secondArg = args[1];
  const secondLower = secondArg.toLowerCase();
  let domainId: QuizDomainSelection;
  let countArgIndex = 2;

  if (secondLower === "all") {
    domainId = "all";
  } else if (UUID_RE.test(secondArg)) {
    domainId = secondArg;
  } else if (/^\d+$/.test(secondArg)) {
    const count = parseInt(secondArg, 10);
    if (isNaN(count) || count < 1) {
      return { status, domainId: "all", complete: false, error: "Invalid count." };
    }
    return { status, domainId: "all", count, complete: true, error: null };
  } else {
    return { complete: false, error: QUIZ_HELP_MESSAGE };
  }

  if (args.length <= countArgIndex) {
    return { status, domainId, complete: false, error: null };
  }

  const countArg = args[countArgIndex].toLowerCase();
  if (countArg === "all") {
    return { status, domainId, count: "all", complete: true, error: null };
  }

  const count = parseInt(countArg, 10);
  if (isNaN(count) || count < 1) {
    return { status, domainId, complete: false, error: "Invalid count." };
  }

  return { status, domainId, count, complete: true, error: null };
}

export async function resolveQuizCount(
  supabase: SupabaseClient,
  userId: string,
  status: ReviewStatus,
  domainId: QuizDomainSelection,
  requestedCount: number | "all",
): Promise<number> {
  const available = await countTermsForQuiz(supabase, userId, status, domainId);
  const maxCount = getMaxQuizQuestionCount(available);

  if (maxCount === 0) return 0;

  if (requestedCount === "all") {
    return maxCount;
  }

  return Math.min(requestedCount, maxCount);
}

// Backwards-compatible export name used by webhook imports.
export const parseReviewCommand = parseQuizCommand;
