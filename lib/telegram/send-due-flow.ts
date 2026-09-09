import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { deliverNextTerm } from "@/lib/jargon/term-delivery";
import type { TelegramAction } from "./actions";
import { CAUGHT_UP_MESSAGE } from "./copy";
import { buildReadRevealKeyboard, formatReadPrompt } from "./presentation";
import { send } from "./transport";

type Client = SupabaseClient<Database>;

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
