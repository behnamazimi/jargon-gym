import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { applyMarkKnown } from "@/lib/jargon/review-outcome";
import {
  deliverNextTerm,
  fetchTermCardForUser,
  resolveUserIdByChatId,
} from "@/lib/jargon/term-delivery";
import type { TelegramAction } from "./actions";
import { CAUGHT_UP_MESSAGE, CONNECT_MESSAGE, MARKED_KNOWN_SUFFIX } from "./copy";
import {
  buildReadKeyboard,
  buildTermInlineKeyboard,
  formatMaskedTermMessage,
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
        send(chatId, formatTermMessage(result.term), buildTermInlineKeyboard(result.term), true),
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

export async function handleKnownCallback(
  client: Client,
  userId: string,
  chatId: number,
  messageId: number,
  callbackId: string,
  termId: string,
  messageText?: string,
): Promise<TelegramAction[]> {
  try {
    await applyMarkKnown(client, userId, termId, "admin");
  } catch {
    return [
      {
        type: "answerCallbackQuery",
        callbackQueryId: callbackId,
        text: "Could not mark that term.",
      },
    ];
  }

  const term = await fetchTermCardForUser(client, userId, termId);
  const updatedText = term
    ? `${formatMaskedTermMessage(term)}\n\n<b>Your action:</b> Mark known${MARKED_KNOWN_SUFFIX}`
    : `${messageText ?? ""}\n\n<b>Your action:</b> Mark known${MARKED_KNOWN_SUFFIX}`;
  const replyMarkup = buildReadKeyboard(termId);

  return [
    { type: "answerCallbackQuery", callbackQueryId: callbackId, text: "Marked as known." },
    edit(chatId, messageId, updatedText, replyMarkup),
  ];
}

/** Inline "Read": rotate to another term without writing an outcome on the current one. */
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
    actions.push(edit(chatId, messageId, `${formatTermMessage(term)}\n\n<b>Your action:</b> Read`));
  }

  const next = await deliverNextTerm(client, userId);
  if (next.kind === "term") {
    actions.push(
      send(chatId, formatTermMessage(next.term), buildTermInlineKeyboard(next.term), true),
    );
  } else if (next.kind === "caughtUp") {
    actions.push(send(chatId, CAUGHT_UP_MESSAGE));
  }

  return actions;
}

/** Cron: deliver due terms for all eligible users. */
export async function handleSendDue(client: Client): Promise<{
  actions: TelegramAction[];
  sent: number;
  caughtUp: number;
}> {
  const { data: dueUsers, error } = await client.rpc("list_due_telegram_users");
  if (error) throw error;

  const actions: TelegramAction[] = [];
  let sent = 0;
  let caughtUp = 0;

  for (const row of dueUsers ?? []) {
    const userId = row.user_id;
    const chatId = Number(row.chat_id);

    const { data: linkRow, error: linkError } = await client
      .from("telegram_links")
      .select("all_caught_up_at")
      .eq("user_id", userId)
      .single();

    if (linkError) {
      console.error("Failed to load telegram link:", linkError);
      continue;
    }

    actions.push({ type: "typing", chatId });

    const result = await deliverNextTerm(client, userId, {
      recordSend: true,
      skipIfAlreadyCaughtUp: true,
      allCaughtUpAt: linkRow.all_caught_up_at,
      persistCaughtUpFlag: true,
    });

    if (result.kind === "term") {
      sent += 1;
      actions.push(
        send(chatId, formatTermMessage(result.term), buildTermInlineKeyboard(result.term), true),
      );
    } else if (result.kind === "caughtUp") {
      caughtUp += 1;
      actions.push(send(chatId, CAUGHT_UP_MESSAGE));
    }
  }

  return { actions, sent, caughtUp };
}
