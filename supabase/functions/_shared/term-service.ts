import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { CAUGHT_UP_MESSAGE } from "./constants.ts";
import {
  buildInlineKeyboard,
  formatTermMessage,
  sendMessage,
  type TermRow,
} from "./telegram-api.ts";

async function clearCaughtUpFlag(supabase: SupabaseClient, userId: string) {
  await supabase
    .from("telegram_links")
    .update({ all_caught_up_at: null, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .not("all_caught_up_at", "is", null);
}

export async function fetchUnknownTermCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("count_unknown_terms", {
    p_user_id: userId,
  });

  if (error) throw error;
  return Number(data ?? 0);
}

export async function pickRandomUnknownTerm(
  supabase: SupabaseClient,
  userId: string,
): Promise<TermRow | null> {
  const { data, error } = await supabase.rpc("pick_random_unknown_term", {
    p_user_id: userId,
  });

  if (error) throw error;
  return (data?.[0] as TermRow | undefined) ?? null;
}

export async function sendTermCard(supabase: SupabaseClient, userId: string, chatId: number) {
  await clearCaughtUpFlag(supabase, userId);

  const term = await pickRandomUnknownTerm(supabase, userId);
  if (!term) {
    return { kind: "caught_up" as const };
  }

  await sendMessage(chatId, formatTermMessage(term), buildInlineKeyboard(term));
  return { kind: "term" as const, term };
}

export async function sendCaughtUpMessage(chatId: number) {
  await sendMessage(chatId, CAUGHT_UP_MESSAGE);
}

export async function sendTermOrCaughtUp(
  supabase: SupabaseClient,
  userId: string,
  chatId: number,
  options?: { recordSend?: boolean },
) {
  const unknownCount = await fetchUnknownTermCount(supabase, userId);

  if (unknownCount === 0) {
    await sendCaughtUpMessage(chatId);
    return { kind: "caught_up" as const };
  }

  const result = await sendTermCard(supabase, userId, chatId);

  if (options?.recordSend) {
    await supabase.rpc("record_telegram_send", { p_user_id: userId });
  }

  return result;
}

export async function resolveUserIdByChatId(
  supabase: SupabaseClient,
  chatId: number,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("telegram_links")
    .select("user_id")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (error) throw error;
  return data?.user_id ?? null;
}
