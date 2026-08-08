import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchCollectionStats } from "@/lib/jargon/collection-stats";
import { applyReviewRating, applyTermShown } from "@/lib/jargon/review-outcome";
import { getMaxStudyCount } from "@/lib/study";
import type { TelegramAction } from "./actions";
import { DEFAULT_TELEGRAM_REVIEW_COUNT } from "./constants";
import {
  NO_KNOWN_REVIEW_TERMS_MESSAGE,
  NO_UNKNOWN_REVIEW_TERMS_MESSAGE,
  REVIEW_REVEAL_FAILED_SUFFIX,
} from "./copy";
import {
  buildReviewRateKeyboard,
  buildReviewRevealKeyboard,
  buildReviewSetupCollectionKeyboard,
  buildReviewSetupCountKeyboard,
  buildReviewSetupStatusKeyboard,
  formatReviewPrompt,
  formatReviewRated,
  formatReviewRevealed,
  formatReviewSessionSummary,
  formatReviewSetupCollectionPrompt,
  formatReviewSetupCountPrompt,
  formatReviewSetupStatusPrompt,
  formatSetupPromptWithAnswer,
} from "./presentation";
import { UUID_RE } from "./command-parse";
import { parseReviewCommand, type ParsedReviewCommand } from "./review-parse";
import {
  clearReviewSetup,
  clearTelegramInteractionState,
  countTermsForReview,
  createReviewSession,
  deleteReviewSession,
  getCurrentReviewTerm,
  getReviewSession,
  hasMoreReviewTerms,
  loadReviewSetup,
  markReviewRevealed,
  recordReviewRating,
  saveReviewSetup,
  type QuizDomainSelection,
  type ReviewSetupState,
  type ReviewStatus,
} from "./session-store";
import { edit, send } from "./transport";

type Client = SupabaseClient<Database>;

async function resolveReviewCount(
  client: Client,
  userId: string,
  status: ReviewStatus,
  domainId: QuizDomainSelection,
  requestedCount: number | "all",
): Promise<number> {
  const available = await countTermsForReview(client, userId, status, domainId);
  const maxCount = getMaxStudyCount(available);
  if (maxCount === 0) return 0;
  if (requestedCount === "all") return maxCount;
  return Math.min(requestedCount, maxCount);
}

async function buildCurrentCardActions(client: Client, chatId: number): Promise<TelegramAction[]> {
  const session = await getReviewSession(client, chatId);
  if (!session) {
    return [send(chatId, "Your review session has expired. Start a new one with /review")];
  }

  const currentTerm = await getCurrentReviewTerm(client, session);
  if (!currentTerm) {
    return buildReviewSummaryActions(client, chatId);
  }

  return [
    send(
      chatId,
      formatReviewPrompt(currentTerm, session.currentIndex, session.termIds.length),
      buildReviewRevealKeyboard(session.currentIndex),
      true,
    ),
  ];
}

async function buildReviewSummaryActions(
  client: Client,
  chatId: number,
): Promise<TelegramAction[]> {
  const session = await getReviewSession(client, chatId);
  if (!session) return [];

  const message = formatReviewSessionSummary(
    session.status,
    session.termIds.length,
    session.positiveCount,
  );
  await deleteReviewSession(client, chatId);
  return [send(chatId, message)];
}

async function startReviewFlashcardSession(
  client: Client,
  chatId: number,
  userId: string,
  status: ReviewStatus,
  domainId: QuizDomainSelection,
  count: number,
): Promise<TelegramAction[]> {
  const session = await createReviewSession(client, chatId, userId, status, domainId, count);

  if (session.termIds.length === 0) {
    const message =
      status === "unknown" ? NO_UNKNOWN_REVIEW_TERMS_MESSAGE : NO_KNOWN_REVIEW_TERMS_MESSAGE;
    await deleteReviewSession(client, chatId);
    return [send(chatId, message)];
  }

  return buildCurrentCardActions(client, chatId);
}

async function startReviewSetup(
  client: Client,
  chatId: number,
  userId: string,
  parsed: ParsedReviewCommand,
): Promise<TelegramAction[]> {
  const startedAt = Date.now();

  if (!parsed.status) {
    const setup: ReviewSetupState = { step: "status", startedAt };
    await saveReviewSetup(client, chatId, setup);
    return [send(chatId, formatReviewSetupStatusPrompt(), buildReviewSetupStatusKeyboard(), true)];
  }

  if (!parsed.domainId) {
    const setup: ReviewSetupState = {
      step: "collection",
      status: parsed.status,
      startedAt,
    };
    await saveReviewSetup(client, chatId, setup);
    return sendReviewCollectionQuestion(client, chatId, userId, parsed.status);
  }

  const setup: ReviewSetupState = {
    step: "count",
    status: parsed.status,
    domainId: parsed.domainId,
    startedAt,
  };
  await saveReviewSetup(client, chatId, setup);
  return sendReviewCountQuestion(client, chatId, userId, parsed.status, parsed.domainId);
}

async function sendReviewCollectionQuestion(
  client: Client,
  chatId: number,
  userId: string,
  status: ReviewStatus,
): Promise<TelegramAction[]> {
  const stats = await fetchCollectionStats(client, userId);
  const activeCollections = stats.filter((collection) => collection.isActive);

  if (activeCollections.length === 0) {
    await clearReviewSetup(client, chatId);
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
      formatReviewSetupCollectionPrompt(),
      buildReviewSetupCollectionKeyboard(collections, allCount),
      true,
    ),
  ];
}

async function sendReviewCountQuestion(
  client: Client,
  chatId: number,
  userId: string,
  status: ReviewStatus,
  domainId: QuizDomainSelection,
): Promise<TelegramAction[]> {
  const available = await countTermsForReview(client, userId, status, domainId);
  const maxCount = getMaxStudyCount(available);

  if (maxCount === 0) {
    const message =
      status === "unknown" ? NO_UNKNOWN_REVIEW_TERMS_MESSAGE : NO_KNOWN_REVIEW_TERMS_MESSAGE;
    await clearReviewSetup(client, chatId);
    return [send(chatId, message)];
  }

  const defaultCount = Math.min(DEFAULT_TELEGRAM_REVIEW_COUNT, maxCount);
  return [
    send(
      chatId,
      formatReviewSetupCountPrompt(maxCount, defaultCount),
      buildReviewSetupCountKeyboard(maxCount),
      true,
    ),
  ];
}

async function formatReviewDomainChoiceLabel(
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

export async function handleReviewCommand(
  client: Client,
  chatId: number,
  userId: string,
  text: string,
): Promise<TelegramAction[]> {
  await clearTelegramInteractionState(client, chatId);

  const parsed = parseReviewCommand(text);

  if (parsed.error) {
    return [send(chatId, parsed.error)];
  }

  if (!parsed.complete) {
    return startReviewSetup(client, chatId, userId, parsed);
  }

  const count = await resolveReviewCount(
    client,
    userId,
    parsed.status!,
    parsed.domainId!,
    parsed.count ?? DEFAULT_TELEGRAM_REVIEW_COUNT,
  );

  await clearReviewSetup(client, chatId);
  return startReviewFlashcardSession(
    client,
    chatId,
    userId,
    parsed.status!,
    parsed.domainId!,
    count,
  );
}

export async function handleReviewSetupCallback(
  client: Client,
  chatId: number,
  userId: string,
  data: string,
  messageId: number,
): Promise<TelegramAction[]> {
  const parts = data.slice("reviewsetup:".length).split(":");
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
          formatReviewSetupStatusPrompt(),
          status === "unknown" ? "Unknown terms" : "Known terms",
        ),
      ),
    );

    const collectionSetup: ReviewSetupState = {
      step: "collection",
      status,
      startedAt: Date.now(),
    };
    await saveReviewSetup(client, chatId, collectionSetup);
    actions.push(...(await sendReviewCollectionQuestion(client, chatId, userId, status)));
    return actions;
  }

  if (action === "domain") {
    const setup = await loadReviewSetup(client, chatId);
    if (!setup?.status) return actions;

    const domainToken = parts.slice(1).join(":");
    const domainId: QuizDomainSelection = domainToken === "all" ? "all" : domainToken;
    if (domainId !== "all" && !UUID_RE.test(domainId)) return actions;

    const domainLabel = await formatReviewDomainChoiceLabel(client, userId, setup.status, domainId);
    actions.push(
      edit(
        chatId,
        messageId,
        formatSetupPromptWithAnswer(formatReviewSetupCollectionPrompt(), domainLabel),
      ),
    );

    const countSetup: ReviewSetupState = {
      step: "count",
      status: setup.status,
      domainId,
      startedAt: Date.now(),
    };
    await saveReviewSetup(client, chatId, countSetup);
    actions.push(
      ...(await sendReviewCountQuestion(client, chatId, userId, setup.status, domainId)),
    );
    return actions;
  }

  if (action === "count") {
    const setup = await loadReviewSetup(client, chatId);
    if (!setup?.status || !setup.domainId) return actions;

    const countToken = parts[1];
    let count: number;

    if (countToken === "all") {
      count = await resolveReviewCount(client, userId, setup.status, setup.domainId, "all");
    } else {
      count = parseInt(countToken, 10);
      if (isNaN(count) || count < 1) return actions;
    }

    const available = await countTermsForReview(client, userId, setup.status, setup.domainId);
    const maxCount = getMaxStudyCount(available);
    const defaultCount = Math.min(DEFAULT_TELEGRAM_REVIEW_COUNT, maxCount);
    const countLabel =
      countToken === "all" ? `All (${count})` : `${count} card${count === 1 ? "" : "s"}`;

    actions.push(
      edit(
        chatId,
        messageId,
        formatSetupPromptWithAnswer(
          formatReviewSetupCountPrompt(maxCount, defaultCount),
          countLabel,
        ),
      ),
    );

    await clearReviewSetup(client, chatId);
    actions.push(
      ...(await startReviewFlashcardSession(
        client,
        chatId,
        userId,
        setup.status,
        setup.domainId,
        count,
      )),
    );
  }

  return actions;
}

export async function handleReviewSetupText(
  client: Client,
  chatId: number,
  userId: string,
  text: string,
): Promise<{ handled: boolean; actions: TelegramAction[] }> {
  const setup = await loadReviewSetup(client, chatId);
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
    const available = await countTermsForReview(client, userId, setup.status, setup.domainId);
    count = Math.min(DEFAULT_TELEGRAM_REVIEW_COUNT, getMaxStudyCount(available));
  } else if (trimmed.toLowerCase() === "all") {
    count = await resolveReviewCount(client, userId, setup.status, setup.domainId, "all");
  } else {
    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed) || parsed < 1) {
      return {
        handled: true,
        actions: [send(chatId, "Send a valid number, tap a button, or /review to start over.")],
      };
    }

    const maxCount = getMaxStudyCount(
      await countTermsForReview(client, userId, setup.status, setup.domainId),
    );

    if (parsed > maxCount) {
      return {
        handled: true,
        actions: [send(chatId, `Maximum for this selection is ${maxCount}. Try again.`)],
      };
    }

    count = parsed;
  }

  const available = await countTermsForReview(client, userId, setup.status, setup.domainId);
  const maxCount = getMaxStudyCount(available);
  const defaultCount = Math.min(DEFAULT_TELEGRAM_REVIEW_COUNT, maxCount);

  if (setup.promptMessageId) {
    const countLabel =
      trimmed === ""
        ? `${defaultCount} (default)`
        : trimmed.toLowerCase() === "all"
          ? `All (${count})`
          : `${count} card${count === 1 ? "" : "s"}`;

    actions.push(
      edit(
        chatId,
        setup.promptMessageId,
        formatSetupPromptWithAnswer(
          formatReviewSetupCountPrompt(maxCount, defaultCount),
          countLabel,
        ),
      ),
    );
  }

  await clearReviewSetup(client, chatId);
  actions.push(
    ...(await startReviewFlashcardSession(
      client,
      chatId,
      userId,
      setup.status,
      setup.domainId,
      count,
    )),
  );

  return { handled: true, actions };
}

/** "Reveal": records shown (only now, not on delivery) and swaps the button row to rating. */
export async function handleReviewReveal(
  client: Client,
  chatId: number,
  messageId: number,
  sessionIndex: number,
): Promise<TelegramAction[]> {
  const session = await getReviewSession(client, chatId);
  if (!session) {
    return [send(chatId, "Your review session has expired. Start a new one with /review")];
  }

  if (sessionIndex !== session.currentIndex || session.revealed) {
    return [];
  }

  const currentTerm = await getCurrentReviewTerm(client, session);
  if (!currentTerm) return [];

  try {
    await applyTermShown(client, session.userId, currentTerm.id, "admin");
  } catch (error) {
    console.error("handleReviewReveal: failed to record shown outcome", {
      userId: session.userId,
      termId: currentTerm.id,
      error,
    });
    // Session state is untouched (still not revealed) so the same Reveal button can be retried.
    return [
      edit(
        chatId,
        messageId,
        `${formatReviewPrompt(currentTerm, session.currentIndex, session.termIds.length)}${REVIEW_REVEAL_FAILED_SUFFIX}`,
        buildReviewRevealKeyboard(session.currentIndex),
      ),
    ];
  }

  const updatedSession = await markReviewRevealed(client, chatId, session);

  return [
    edit(
      chatId,
      messageId,
      formatReviewRevealed(currentTerm, updatedSession.currentIndex, updatedSession.termIds.length),
      buildReviewRateKeyboard(updatedSession.currentIndex, updatedSession.status),
    ),
  ];
}

/** "Had it / Didn't have it" (or "Still know it / Forgot it"): records rating, advances. */
export async function handleReviewRate(
  client: Client,
  chatId: number,
  messageId: number,
  sessionIndex: number,
  known: boolean,
): Promise<TelegramAction[]> {
  const session = await getReviewSession(client, chatId);
  if (!session) {
    return [send(chatId, "Your review session has expired. Start a new one with /review")];
  }

  if (sessionIndex !== session.currentIndex || !session.revealed) {
    return [];
  }

  const currentTerm = await getCurrentReviewTerm(client, session);
  if (!currentTerm) return [];

  await applyReviewRating(client, session.userId, {
    termId: currentTerm.id,
    known,
    sessionStatus: session.status,
    alreadyCountedSeen: true,
    mode: "admin",
  });

  const updatedSession = await recordReviewRating(client, chatId, session, known);

  const actions: TelegramAction[] = [
    edit(
      chatId,
      messageId,
      formatReviewRated(currentTerm, sessionIndex, session.termIds.length, session.status, known),
    ),
  ];

  if (hasMoreReviewTerms(updatedSession)) {
    actions.push({ type: "pause", chatId, ms: 1200 });
    actions.push(...(await buildCurrentCardActions(client, chatId)));
  } else {
    actions.push({ type: "pause", chatId, ms: 800 });
    actions.push(...(await buildReviewSummaryActions(client, chatId)));
  }

  return actions;
}
