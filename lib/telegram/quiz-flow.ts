import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchCollectionStats } from "@/lib/jargon/collection-stats";
import { applyQuizAnswer, applyTermSeen } from "@/lib/jargon/review-outcome";
import { selectDistractorsFromDomain } from "@/lib/quiz/distractors";
import type { TelegramAction } from "./actions";
import { NO_KNOWN_TERMS_MESSAGE, NO_UNKNOWN_TERMS_MESSAGE } from "./copy";
import {
  buildQuizCollectionKeyboard,
  buildQuizCountKeyboard,
  buildQuizStatusKeyboard,
  buildReviewKeyboard,
  formatQuizSetupCollectionPrompt,
  formatQuizSetupCountPrompt,
  formatQuizSetupStatusPrompt,
  formatReviewQuestion,
  formatReviewQuestionWithAnswer,
  formatReviewSummary,
  formatSetupPromptWithAnswer,
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
  type ReviewStatus,
} from "./session-store";
import { edit, send } from "./transport";

type Client = SupabaseClient<Database>;

async function resolveQuizCount(
  client: Client,
  userId: string,
  status: ReviewStatus,
  domainId: QuizDomainSelection,
  requestedCount: number | "all",
): Promise<number> {
  const available = await countTermsForQuiz(client, userId, status, domainId);
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

  await applyTermSeen(client, session.userId, currentTerm.id, "admin");

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

  const message = formatReviewSummary(session.correctCount, session.termIds.length, session.status);
  await deleteSession(client, chatId);
  return [send(chatId, message)];
}

async function startReviewSession(
  client: Client,
  chatId: number,
  userId: string,
  status: ReviewStatus,
  domainId: QuizDomainSelection,
  count: number,
): Promise<TelegramAction[]> {
  const session = await createSession(client, chatId, userId, status, domainId, count);

  if (session.termIds.length === 0) {
    const message = status === "unknown" ? NO_UNKNOWN_TERMS_MESSAGE : NO_KNOWN_TERMS_MESSAGE;
    await deleteSession(client, chatId);
    return [send(chatId, message)];
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

  if (!parsed.status) {
    const setup: QuizSetupState = { step: "status", startedAt };
    await saveQuizSetup(client, chatId, setup);
    return [send(chatId, formatQuizSetupStatusPrompt(), buildQuizStatusKeyboard(), true)];
  }

  if (!parsed.domainId) {
    const setup: QuizSetupState = {
      step: "collection",
      status: parsed.status,
      startedAt,
    };
    await saveQuizSetup(client, chatId, setup);
    return sendCollectionQuestion(client, chatId, userId, parsed.status, setup);
  }

  const setup: QuizSetupState = {
    step: "count",
    status: parsed.status,
    domainId: parsed.domainId,
    startedAt,
  };
  await saveQuizSetup(client, chatId, setup);
  return sendCountQuestion(client, chatId, userId, parsed.status, parsed.domainId, setup);
}

async function sendCollectionQuestion(
  client: Client,
  chatId: number,
  userId: string,
  status: ReviewStatus,
  _setup: QuizSetupState,
): Promise<TelegramAction[]> {
  const stats = await fetchCollectionStats(client, userId);
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
    count:
      status === "known" ? collection.knownCount : collection.totalCount - collection.knownCount,
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
  status: ReviewStatus,
  domainId: QuizDomainSelection,
  _setup: QuizSetupState,
): Promise<TelegramAction[]> {
  const available = await countTermsForQuiz(client, userId, status, domainId);
  const maxCount = getMaxQuizQuestionCount(available);

  if (maxCount === 0) {
    const message = status === "unknown" ? NO_UNKNOWN_TERMS_MESSAGE : NO_KNOWN_TERMS_MESSAGE;
    await clearQuizSetup(client, chatId);
    return [send(chatId, message)];
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
  status: ReviewStatus,
  domainId: QuizDomainSelection,
): Promise<string> {
  const stats = await fetchCollectionStats(client, userId);
  const activeCollections = stats.filter((collection) => collection.isActive);

  if (domainId === "all") {
    const allCount = activeCollections.reduce(
      (total, collection) =>
        total +
        (status === "known"
          ? collection.knownCount
          : collection.totalCount - collection.knownCount),
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
    parsed.status!,
    parsed.domainId!,
    parsed.count ?? DEFAULT_TELEGRAM_QUIZ_COUNT,
  );

  await clearQuizSetup(client, chatId);
  return startReviewSession(client, chatId, userId, parsed.status!, parsed.domainId!, count);
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

  if (action === "status") {
    const status = parts[1] as ReviewStatus;
    if (status !== "known" && status !== "unknown") return actions;

    actions.push(
      edit(
        chatId,
        messageId,
        formatSetupPromptWithAnswer(
          formatQuizSetupStatusPrompt(),
          status === "unknown" ? "Unknown terms" : "Known terms",
        ),
      ),
    );

    const collectionSetup: QuizSetupState = {
      step: "collection",
      status,
      startedAt: Date.now(),
    };
    await saveQuizSetup(client, chatId, collectionSetup);
    actions.push(
      ...(await sendCollectionQuestion(client, chatId, userId, status, collectionSetup)),
    );
    return actions;
  }

  if (action === "domain") {
    const setup = await loadQuizSetup(client, chatId);
    if (!setup?.status) return actions;

    const domainToken = parts.slice(1).join(":");
    const domainId: QuizDomainSelection = domainToken === "all" ? "all" : domainToken;
    if (domainId !== "all" && !UUID_RE.test(domainId)) return actions;

    const domainLabel = await formatDomainChoiceLabel(client, userId, setup.status, domainId);
    actions.push(
      edit(
        chatId,
        messageId,
        formatSetupPromptWithAnswer(formatQuizSetupCollectionPrompt(), domainLabel),
      ),
    );

    const countSetup: QuizSetupState = {
      step: "count",
      status: setup.status,
      domainId,
      startedAt: Date.now(),
    };
    await saveQuizSetup(client, chatId, countSetup);
    actions.push(
      ...(await sendCountQuestion(client, chatId, userId, setup.status, domainId, countSetup)),
    );
    return actions;
  }

  if (action === "count") {
    const setup = await loadQuizSetup(client, chatId);
    if (!setup?.status || !setup.domainId) return actions;

    const countToken = parts[1];
    let count: number;

    if (countToken === "all") {
      count = await resolveQuizCount(client, userId, setup.status, setup.domainId, "all");
    } else {
      count = parseInt(countToken, 10);
      if (isNaN(count) || count < 1) return actions;
    }

    const available = await countTermsForQuiz(client, userId, setup.status, setup.domainId);
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
    actions.push(
      ...(await startReviewSession(client, chatId, userId, setup.status, setup.domainId, count)),
    );
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
  if (!setup || setup.step !== "count" || !setup.status || !setup.domainId) {
    return { handled: false, actions: [] };
  }

  const trimmed = text.trim();
  if (trimmed.startsWith("/")) {
    return { handled: false, actions: [] };
  }

  let count: number;
  const actions: TelegramAction[] = [];

  if (trimmed === "") {
    const available = await countTermsForQuiz(client, userId, setup.status, setup.domainId);
    count = Math.min(DEFAULT_TELEGRAM_QUIZ_COUNT, getMaxQuizQuestionCount(available));
  } else if (trimmed.toLowerCase() === "all") {
    count = await resolveQuizCount(client, userId, setup.status, setup.domainId, "all");
  } else {
    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed) || parsed < 1) {
      return {
        handled: true,
        actions: [send(chatId, "Send a valid number, tap a button, or /quiz to start over.")],
      };
    }

    const maxCount = getMaxQuizQuestionCount(
      await countTermsForQuiz(client, userId, setup.status, setup.domainId),
    );

    if (parsed > maxCount) {
      return {
        handled: true,
        actions: [send(chatId, `Maximum for this selection is ${maxCount}. Try again.`)],
      };
    }

    count = parsed;
  }

  const available = await countTermsForQuiz(client, userId, setup.status, setup.domainId);
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
  actions.push(
    ...(await startReviewSession(client, chatId, userId, setup.status, setup.domainId, count)),
  );

  return { handled: true, actions };
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
    status: session.status,
    mode: "admin",
  });

  const markedUnknown = !isCorrect && flipped;
  const markedKnown = isCorrect && session.status === "unknown" && flipped;

  const updatedSession = await updateSession(client, chatId, session, isCorrect);

  const actions: TelegramAction[] = [
    edit(
      chatId,
      messageId,
      formatReviewQuestionWithAnswer(
        currentTerm,
        sessionIndex,
        updatedSession.termIds.length,
        selectedTermName,
        isCorrect,
        updatedSession.correctCount,
        markedUnknown,
        markedKnown,
      ),
    ),
  ];

  if (hasMoreQuestions(updatedSession)) {
    actions.push({ type: "pause", chatId, ms: 1500 });
    actions.push(...(await buildNextQuestionActions(client, chatId)));
  } else {
    actions.push({ type: "pause", chatId, ms: 1000 });
    actions.push(...(await buildReviewSummaryActions(client, chatId)));
  }

  return actions;
}
