import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TelegramAction } from "./actions";
import { resolveUserIdByChatId } from "@/lib/terms/term-delivery";
import { ALREADY_CONNECTED_MESSAGE, CONNECT_MESSAGE, WELCOME_MESSAGE } from "./copy";
import { completeTelegramLink } from "./links";
import { send } from "./transport";

type Client = SupabaseClient<Database>;

export function parseStartToken(text: string): string | null {
  const match = text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
  return match?.[1]?.trim() ?? null;
}

export function isReadCommand(text: string): boolean {
  return /^\/read(?:@\w+)?$/i.test(text.trim());
}

export function isQuizCommand(text: string): boolean {
  return /^\/quiz(?:@\w+)?(?:\s+.*)?$/i.test(text.trim());
}

export function isReviewCommand(text: string): boolean {
  return /^\/review(?:@\w+)?(?:\s+.*)?$/i.test(text.trim());
}

export async function handleStart(
  client: Client,
  chatId: number,
  token: string | null,
): Promise<TelegramAction[]> {
  if (!token) {
    const linkedUserId = await resolveUserIdByChatId(client, chatId);
    return [send(chatId, linkedUserId ? ALREADY_CONNECTED_MESSAGE : CONNECT_MESSAGE)];
  }

  const result = await completeTelegramLink(client, chatId, token);
  if (!result.ok) {
    const message =
      result.reason === "already_linked"
        ? "This Telegram account is already linked to another Lobyas user."
        : "That link is invalid or expired. Generate a new one in Lobyas settings.";
    return [send(chatId, message)];
  }

  return [send(chatId, WELCOME_MESSAGE)];
}
