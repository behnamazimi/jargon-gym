import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { CAUGHT_UP_MESSAGE } from "./constants.ts";
import {
  buildInlineKeyboard,
  formatTermMessage,
  sendMessage,
  type TermRow,
} from "./telegram-api.ts";

type SendOptions = {
  recordSend?: boolean;
  /** Cron: don't re-notify if user already received caught-up */
  skipIfAlreadyCaughtUp?: boolean;
  allCaughtUpAt?: string | null;
  /** Cron: persist all_caught_up_at when sending caught-up message */
  persistCaughtUpFlag?: boolean;
};

export type SendResult =
  | { kind: "term"; term: TermRow }
  | { kind: "caught_up" }
  | { kind: "skipped" };

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

async function sendCaughtUpAndMaybePersist(
  supabase: SupabaseClient,
  userId: string,
  chatId: number,
  options?: SendOptions,
): Promise<{ kind: "caught_up" } | { kind: "skipped" }> {
  if (options?.skipIfAlreadyCaughtUp && options?.allCaughtUpAt) {
    return { kind: "skipped" };
  }

  await sendCaughtUpMessage(chatId);

  if (options?.persistCaughtUpFlag) {
    await supabase.rpc("set_telegram_all_caught_up", { p_user_id: userId });
  }

  return { kind: "caught_up" };
}

export async function sendTermOrCaughtUp(
  supabase: SupabaseClient,
  userId: string,
  chatId: number,
  options?: SendOptions,
): Promise<SendResult> {
  const unknownCount = await fetchUnknownTermCount(supabase, userId);

  if (unknownCount === 0) {
    const result = await sendCaughtUpAndMaybePersist(supabase, userId, chatId, options);

    if (result.kind === "caught_up" && options?.recordSend) {
      await supabase.rpc("record_telegram_send", { p_user_id: userId });
    }

    return result;
  }

  const result = await sendTermCard(supabase, userId, chatId);

  if (result.kind === "caught_up") {
    const caughtUpResult = await sendCaughtUpAndMaybePersist(supabase, userId, chatId, options);

    if (options?.recordSend) {
      await supabase.rpc("record_telegram_send", { p_user_id: userId });
    }

    return caughtUpResult;
  }

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
