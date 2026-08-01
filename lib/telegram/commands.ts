import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchCollectionStats } from "@/lib/jargon/collection-stats";
import { resolveUserIdByChatId } from "@/lib/jargon/term-delivery";
import type { TelegramAction } from "./actions";
import { CONNECT_MESSAGE, WELCOME_MESSAGE } from "./copy";
import { completeTelegramLink } from "./links";
import { formatStatsMessage } from "./presentation";
import { send } from "./transport";

type Client = SupabaseClient<Database>;

export function parseStartToken(text: string): string | null {
  const match = text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
  return match?.[1]?.trim() ?? null;
}

export function isNextCommand(text: string): boolean {
  return /^\/next(?:@\w+)?$/i.test(text.trim());
}

export function isStatCommand(text: string): boolean {
  return /^\/stat(?:s)?(?:@\w+)?$/i.test(text.trim());
}

export function isQuizCommand(text: string): boolean {
  return /^\/quiz(?:@\w+)?(?:\s+.*)?$/i.test(text.trim());
}

export async function handleStart(
  client: Client,
  chatId: number,
  token: string | null,
): Promise<TelegramAction[]> {
  if (!token) {
    return [send(chatId, CONNECT_MESSAGE)];
  }

  const result = await completeTelegramLink(client, chatId, token);
  if (!result.ok) {
    const message =
      result.reason === "already_linked"
        ? "This Telegram account is already linked to another Jargon Gym user."
        : "That link is invalid or expired. Generate a new one in Jargon Gym settings.";
    return [send(chatId, message)];
  }

  return [send(chatId, WELCOME_MESSAGE)];
}

export async function handleStat(client: Client, chatId: number): Promise<TelegramAction[]> {
  const userId = await resolveUserIdByChatId(client, chatId);
  if (!userId) return [send(chatId, CONNECT_MESSAGE)];

  const stats = await fetchCollectionStats(client, userId);
  return [send(chatId, formatStatsMessage(stats))];
}
