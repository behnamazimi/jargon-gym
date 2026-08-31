import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { recordRead } from "@/lib/jargon/review-outcome";
import {
  deliverNextTerm,
  fetchTermCardForUser,
  resolveUserIdByChatId,
} from "@/lib/jargon/term-delivery";
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

  return [edit(chatId, messageId, formatTermMessage(term), buildTermInlineKeyboard(term))];
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

    try {
      const result = await deliverNextTerm(client, userId, {
        recordSend: true,
        skipIfAlreadyCaughtUp: true,
        allCaughtUpAt: linkRow.all_caught_up_at,
        persistCaughtUpFlag: true,
      });

      if (result.kind === "term") {
        sent += 1;
        actions.push(
          send(
            chatId,
            formatReadPrompt(result.term),
            buildReadRevealKeyboard(result.term.id),
            true,
          ),
        );
      } else if (result.kind === "caughtUp") {
        caughtUp += 1;
        actions.push(send(chatId, CAUGHT_UP_MESSAGE));
      }
    } catch (error) {
      console.error("handleSendDue: failed to deliver term for user", { userId, error });
    }
  }

  return { actions, sent, caughtUp };
}
