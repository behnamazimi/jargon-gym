import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { setTermMarkedKnownForUser } from "@/lib/jargon/known-state";
import { recordRead } from "@/lib/jargon/review-outcome";
import {
  deliverNextTerm,
  fetchTermCardForUser,
  resolveUserIdByChatId,
} from "@/lib/jargon/term-delivery";
import { fetchTraceStateForUser } from "@/lib/trace-queue";
import type { TelegramAction } from "./actions";
import {
  CAUGHT_UP_MESSAGE,
  CONNECT_MESSAGE,
  READ_NEXT_FAILED_MESSAGE,
  READ_REVEAL_FAILED_SUFFIX,
} from "./copy";
import {
  buildReadRevealKeyboard,
  buildTermInlineKeyboard,
  formatReadPrompt,
  formatTermMessage,
} from "./presentation";
import { clearTelegramInteractionState } from "./session-store";
import { edit, send } from "./transport";

type Client = SupabaseClient<Database>;

export async function handleRead(client: Client, chatId: number): Promise<TelegramAction[]> {
  const userId = await resolveUserIdByChatId(client, chatId);
  if (!userId) return [send(chatId, CONNECT_MESSAGE)];

  await clearTelegramInteractionState(client, chatId);

  try {
    const result = await deliverNextTerm(client, userId);
    if (result.kind === "term") {
      return [
        send(chatId, formatReadPrompt(result.term), buildReadRevealKeyboard(result.term.id), true),
      ];
    }
    if (result.kind === "caughtUp") {
      return [send(chatId, CAUGHT_UP_MESSAGE)];
    }
    return [];
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("handleRead error:", detail, error);
    return [send(chatId, "Could not send a term right now. Try again in a moment.")];
  }
}

/** "Reveal": records the read (only now, not on delivery) and swaps the masked
 *  prompt for the full term. */
export async function handleReadReveal(
  client: Client,
  userId: string,
  chatId: number,
  messageId: number,
  termId: string,
): Promise<TelegramAction[]> {
  const term = await fetchTermCardForUser(client, userId, termId);
  if (!term) return [];

  // Snapshot before recordRead below bumps read_count — this is the only
  // moment that can tell "never seen before" from "seen before".
  const priorState = await fetchTraceStateForUser(client, userId, termId);
  const isNewToUser =
    priorState.readCount === 0 &&
    priorState.reviewRecallCount === 0 &&
    priorState.quizTestCount === 0;

  try {
    await recordRead(client, userId, termId, "admin");
  } catch (error) {
    console.error("handleReadReveal: failed to record read", { userId, termId, error });
    // Nothing recorded, so the same Reveal button can be retried.
    return [
      edit(
        chatId,
        messageId,
        `${formatReadPrompt(term)}${READ_REVEAL_FAILED_SUFFIX}`,
        buildReadRevealKeyboard(termId),
      ),
    ];
  }

  return [
    edit(chatId, messageId, formatTermMessage(term), buildTermInlineKeyboard(term, isNewToUser)),
  ];
}

/** "I already know this" on a first-exposure card: marks it known (a
 *  separate, user-set signal from TRACE's earned state) and delivers the
 *  next term. */
export async function handleReadMarkKnown(
  client: Client,
  userId: string,
  chatId: number,
  messageId: number,
  termId: string,
): Promise<TelegramAction[]> {
  const term = await fetchTermCardForUser(client, userId, termId);
  if (!term) return [];

  const actions: TelegramAction[] = [];

  try {
    await setTermMarkedKnownForUser(client, userId, termId, true);
    actions.push(
      edit(
        chatId,
        messageId,
        `${formatTermMessage(term)}\n\n<b>Marked known.</b> You won't see this term again unless you add it back to learning.`,
      ),
    );
  } catch (error) {
    console.error("handleReadMarkKnown: failed to mark known", { userId, termId, error });
    return [edit(chatId, messageId, formatTermMessage(term), buildTermInlineKeyboard(term))];
  }

  try {
    const next = await deliverNextTerm(client, userId);
    if (next.kind === "term") {
      actions.push(
        send(chatId, formatReadPrompt(next.term), buildReadRevealKeyboard(next.term.id), true),
      );
    } else if (next.kind === "caughtUp") {
      actions.push(send(chatId, CAUGHT_UP_MESSAGE));
    }
  } catch (error) {
    console.error("handleReadMarkKnown: failed to deliver next term", { userId, error });
    actions.push(send(chatId, READ_NEXT_FAILED_MESSAGE));
  }

  return actions;
}

/** Inline "Read next": rotate to another term without writing an outcome on the current one. */
export async function handleReadCallback(
  client: Client,
  userId: string,
  chatId: number,
  messageId: number,
  termId: string,
): Promise<TelegramAction[]> {
  const actions: TelegramAction[] = [];

  const term = await fetchTermCardForUser(client, userId, termId);
  if (term) {
    actions.push(
      edit(chatId, messageId, `${formatTermMessage(term)}\n\n<b>Your action:</b> Read next`),
    );
  }

  try {
    const next = await deliverNextTerm(client, userId);
    if (next.kind === "term") {
      actions.push(
        send(chatId, formatReadPrompt(next.term), buildReadRevealKeyboard(next.term.id), true),
      );
    } else if (next.kind === "caughtUp") {
      actions.push(send(chatId, CAUGHT_UP_MESSAGE));
    }
  } catch (error) {
    console.error("handleReadCallback: failed to deliver next term", { userId, error });
    actions.push(send(chatId, READ_NEXT_FAILED_MESSAGE));
  }

  return actions;
}

export { handleSendDue } from "./send-due-flow";
