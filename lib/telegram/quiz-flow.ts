import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchCollectionStats } from "@/lib/jargon/collection-stats";
import { applyQuizAnswer } from "@/lib/jargon/review-outcome";
import { selectDistractorsFromDomain } from "@/lib/quiz/distractors";
import type { TelegramAction } from "./actions";
import { NO_KNOWN_TERMS_FOR_QUIZ_MESSAGE, NOTHING_ELIGIBLE_FOR_QUIZ_MESSAGE } from "./copy";
import {
  buildQuizCollectionKeyboard,
  buildQuizCountKeyboard,
  buildReviewKeyboard,
  buildTrueFalseKeyboard,
  formatQuizSetupCollectionPrompt,
  formatQuizSetupCountPrompt,
  formatReviewQuestion,
  formatReviewQuestionWithAnswer,
  formatReviewSummary,
  formatSetupPromptWithAnswer,
  formatTrueFalseQuestion,
  formatTrueFalseQuestionWithAnswer,
} from "./presentation";
import { parseQuizCommand, UUID_RE, type ParsedQuizCommand } from "./quiz-parse";
import {
  clearQuizSetup,
  countTermsForQuiz,
  createSession,
  DEFAULT_TELEGRAM_QUIZ_COUNT,
  deleteSession,
  getCurrentTerm,
  getMaxQuizQuestionCount,
  getSession,
  hasMoreQuestions,
  loadQuizSetup,
  saveQuizSetup,
  updateSession,
  type QuizDomainSelection,
  type QuizSetupState,
  type ReviewSession,
} from "./session-store";
import { edit, send } from "./transport";

type Client = SupabaseClient<Database>;

/** Quiz is known-pool only — every setup/session step below hardcodes "known". */
const QUIZ_STATUS = "known" as const;

async function resolveQuizCount(
  client: Client,
  userId: string,
  domainId: QuizDomainSelection,
  requestedCount: number | "all",
): Promise<number> {
  const available = await countTermsForQuiz(client, userId, QUIZ_STATUS, domainId);
  const maxCount = getMaxQuizQuestionCount(available);
  if (maxCount === 0) return 0;
  if (requestedCount === "all") return maxCount;
  return Math.min(requestedCount, maxCount);
}

async function buildNextQuestionActions(client: Client, chatId: number): Promise<TelegramAction[]> {
  const session = await getSession(client, chatId);
  if (!session) {
    return [send(chatId, "Your quiz session has expired. Start a new one with /quiz")];
  }

  const currentTerm = await getCurrentTerm(client, session);
  if (!currentTerm) {
    return buildReviewSummaryActions(client, chatId);
  }

  const exampleJudgment = session.exampleJudgment[currentTerm.id];
  if (exampleJudgment) {
    return [
      send(
        chatId,
        formatTrueFalseQuestion(
          currentTerm,
          session.currentIndex,
          session.termIds.length,
          exampleJudgment.text,
        ),
        buildTrueFalseKeyboard(session.currentIndex),
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

async function buildReviewSummaryActions(
  client: Client,
  chatId: number,
): Promise<TelegramAction[]> {
  const session = await getSession(client, chatId);
  if (!session) return [];

  const message = formatReviewSummary(session.correctCount, session.termIds.length);
  await deleteSession(client, chatId);
  return [send(chatId, message)];
}

async function startReviewSession(
  client: Client,
  chatId: number,
  userId: string,
  domainId: QuizDomainSelection,
  count: number,
): Promise<TelegramAction[]> {
  const session = await createSession(client, chatId, userId, QUIZ_STATUS, domainId, count);

  if (session.termIds.length === 0) {
    await deleteSession(client, chatId);
    return [send(chatId, NOTHING_ELIGIBLE_FOR_QUIZ_MESSAGE)];
  }

  return buildNextQuestionActions(client, chatId);
}

async function startQuizSetup(
  client: Client,
  chatId: number,
  userId: string,
  parsed: ParsedQuizCommand,
): Promise<TelegramAction[]> {
  const startedAt = Date.now();

  if (!parsed.domainId) {
    const setup: QuizSetupState = { step: "collection", status: QUIZ_STATUS, startedAt };
    await saveQuizSetup(client, chatId, setup);
    return sendCollectionQuestion(client, chatId, userId, setup);
  }

  const setup: QuizSetupState = {
    step: "count",
    status: QUIZ_STATUS,
    domainId: parsed.domainId,
    startedAt,
  };
  await saveQuizSetup(client, chatId, setup);
  return sendCountQuestion(client, chatId, userId, parsed.domainId, setup);
}

async function sendCollectionQuestion(
  client: Client,
  chatId: number,
  userId: string,
  _setup: QuizSetupState,
): Promise<TelegramAction[]> {
  const stats = await fetchCollectionStats(client, userId, "quiz");
  const activeCollections = stats.filter((collection) => collection.isActive);

  if (activeCollections.length === 0) {
    await clearQuizSetup(client, chatId);
    return [
      send(
        chatId,
        "You have no active collections in your review pool. Turn one on in the app first.",
      ),
    ];
  }

  const collections = activeCollections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    count: collection.knownCount,
  }));
  const allCount = collections.reduce((total, collection) => total + collection.count, 0);

  return [
    send(
      chatId,
      formatQuizSetupCollectionPrompt(),
      buildQuizCollectionKeyboard(collections, allCount),
      true,
    ),
  ];
}

async function sendCountQuestion(
  client: Client,
  chatId: number,
  userId: string,
  domainId: QuizDomainSelection,
  _setup: QuizSetupState,
): Promise<TelegramAction[]> {
  const available = await countTermsForQuiz(client, userId, QUIZ_STATUS, domainId);
  const maxCount = getMaxQuizQuestionCount(available);

  if (maxCount === 0) {
    await clearQuizSetup(client, chatId);
    return [send(chatId, NO_KNOWN_TERMS_FOR_QUIZ_MESSAGE)];
  }

  const defaultCount = Math.min(DEFAULT_TELEGRAM_QUIZ_COUNT, maxCount);
  return [
    send(
      chatId,
      formatQuizSetupCountPrompt(maxCount, defaultCount),
      buildQuizCountKeyboard(maxCount),
      true,
    ),
  ];
}

async function formatDomainChoiceLabel(
  client: Client,
  userId: string,
  domainId: QuizDomainSelection,
): Promise<string> {
  const stats = await fetchCollectionStats(client, userId, "quiz");
  const activeCollections = stats.filter((collection) => collection.isActive);

  if (domainId === "all") {
    const allCount = activeCollections.reduce(
      (total, collection) => total + collection.knownCount,
      0,
    );
    return `All collections (${allCount})`;
  }

  const collection = activeCollections.find((item) => item.id === domainId);
  return collection?.name ?? "Selected collection";
}

export async function handleQuizCommand(
  client: Client,
  chatId: number,
  userId: string,
  text: string,
): Promise<TelegramAction[]> {
  const parsed = parseQuizCommand(text);

  if (parsed.error) {
    return [send(chatId, parsed.error)];
  }

  if (!parsed.complete) {
    return startQuizSetup(client, chatId, userId, parsed);
  }

  const count = await resolveQuizCount(
    client,
    userId,
    parsed.domainId!,
    parsed.count ?? DEFAULT_TELEGRAM_QUIZ_COUNT,
  );

  await clearQuizSetup(client, chatId);
  return startReviewSession(client, chatId, userId, parsed.domainId!, count);
}

export async function handleQuizSetupCallback(
  client: Client,
  chatId: number,
  userId: string,
  data: string,
  messageId: number,
): Promise<TelegramAction[]> {
  const parts = data.slice("quizsetup:".length).split(":");
  const action = parts[0];
  const actions: TelegramAction[] = [];

  if (action === "domain") {
    const domainToken = parts.slice(1).join(":");
    const domainId: QuizDomainSelection = domainToken === "all" ? "all" : domainToken;
    if (domainId !== "all" && !UUID_RE.test(domainId)) return actions;

    const domainLabel = await formatDomainChoiceLabel(client, userId, domainId);
    actions.push(
      edit(
        chatId,
        messageId,
        formatSetupPromptWithAnswer(formatQuizSetupCollectionPrompt(), domainLabel),
      ),
    );

    const countSetup: QuizSetupState = {
      step: "count",
      status: QUIZ_STATUS,
      domainId,
      startedAt: Date.now(),
    };
    await saveQuizSetup(client, chatId, countSetup);
    actions.push(...(await sendCountQuestion(client, chatId, userId, domainId, countSetup)));
    return actions;
  }

  if (action === "count") {
    const setup = await loadQuizSetup(client, chatId);
    if (!setup?.domainId) return actions;

    const countToken = parts[1];
    let count: number;

    if (countToken === "all") {
      count = await resolveQuizCount(client, userId, setup.domainId, "all");
    } else {
      count = parseInt(countToken, 10);
      if (isNaN(count) || count < 1) return actions;
    }

    const available = await countTermsForQuiz(client, userId, QUIZ_STATUS, setup.domainId);
    const maxCount = getMaxQuizQuestionCount(available);
    const defaultCount = Math.min(DEFAULT_TELEGRAM_QUIZ_COUNT, maxCount);
    const countLabel =
      countToken === "all" ? `All (${count})` : `${count} question${count === 1 ? "" : "s"}`;

    actions.push(
      edit(
        chatId,
        messageId,
        formatSetupPromptWithAnswer(formatQuizSetupCountPrompt(maxCount, defaultCount), countLabel),
      ),
    );

    await clearQuizSetup(client, chatId);
    actions.push(...(await startReviewSession(client, chatId, userId, setup.domainId, count)));
  }

  return actions;
}

export async function handleQuizSetupText(
  client: Client,
  chatId: number,
  userId: string,
  text: string,
): Promise<{ handled: boolean; actions: TelegramAction[] }> {
  const setup = await loadQuizSetup(client, chatId);
  if (!setup || setup.step !== "count" || !setup.domainId) {
    return { handled: false, actions: [] };
  }

  const trimmed = text.trim();
  if (trimmed.startsWith("/")) {
    return { handled: false, actions: [] };
  }

  let count: number;
  const actions: TelegramAction[] = [];

  if (trimmed === "") {
    const available = await countTermsForQuiz(client, userId, QUIZ_STATUS, setup.domainId);
    count = Math.min(DEFAULT_TELEGRAM_QUIZ_COUNT, getMaxQuizQuestionCount(available));
  } else if (trimmed.toLowerCase() === "all") {
    count = await resolveQuizCount(client, userId, setup.domainId, "all");
  } else {
    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed) || parsed < 1) {
      return {
        handled: true,
        actions: [send(chatId, "Send a valid number, tap a button, or /quiz to start over.")],
      };
    }

    const maxCount = getMaxQuizQuestionCount(
      await countTermsForQuiz(client, userId, QUIZ_STATUS, setup.domainId),
    );

    if (parsed > maxCount) {
      return {
        handled: true,
        actions: [send(chatId, `Maximum for this selection is ${maxCount}. Try again.`)],
      };
    }

    count = parsed;
  }

  const available = await countTermsForQuiz(client, userId, QUIZ_STATUS, setup.domainId);
  const maxCount = getMaxQuizQuestionCount(available);
  const defaultCount = Math.min(DEFAULT_TELEGRAM_QUIZ_COUNT, maxCount);

  if (setup.promptMessageId) {
    const countLabel =
      trimmed === ""
        ? `${defaultCount} (default)`
        : trimmed.toLowerCase() === "all"
          ? `All (${count})`
          : `${count} question${count === 1 ? "" : "s"}`;

    actions.push(
      edit(
        chatId,
        setup.promptMessageId,
        formatSetupPromptWithAnswer(formatQuizSetupCountPrompt(maxCount, defaultCount), countLabel),
      ),
    );
  }

  await clearQuizSetup(client, chatId);
  actions.push(...(await startReviewSession(client, chatId, userId, setup.domainId, count)));

  return { handled: true, actions };
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

  const { flipped } = await applyQuizAnswer(client, session.userId, {
    termId: currentTerm.id,
    passed: isCorrect,
    mode: "admin",
  });

  const markedUnknown = !isCorrect && flipped;

  const message = formatReviewQuestionWithAnswer(
    currentTerm,
    sessionIndex,
    session.termIds.length,
    selectedTermName,
    isCorrect,
    session.correctCount + (isCorrect ? 1 : 0),
    markedUnknown,
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

  const { flipped } = await applyQuizAnswer(client, session.userId, {
    termId: currentTerm.id,
    passed: isCorrect,
    mode: "admin",
  });

  const markedUnknown = !isCorrect && flipped;

  const message = formatTrueFalseQuestionWithAnswer(
    currentTerm,
    sessionIndex,
    session.termIds.length,
    exampleJudgment.text,
    answer,
    exampleJudgment.correctAnswer,
    isCorrect,
    session.correctCount + (isCorrect ? 1 : 0),
    markedUnknown,
  );

  return finishAnsweredQuestion(client, chatId, messageId, session, isCorrect, message);
}
