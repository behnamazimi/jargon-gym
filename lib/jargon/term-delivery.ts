/**
 * Term delivery for Telegram /read and cadence pushes.
 * Returns presentation-neutral DTOs — channel adapters render them.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TermCard } from "@/lib/jargon/term-card";
import { applyTermShown } from "@/lib/jargon/review-outcome";
import {
  getReviewPoolStatsForUser,
  pickReviewTermsForUser,
  fetchTermCardForUser,
} from "@/lib/smart-queue";

type Client = SupabaseClient<Database>;

export type DeliverOptions = {
  /** Cron: call record_telegram_send after delivery */
  recordSend?: boolean;
  /** Cron: don't re-notify if user already received caught-up */
  skipIfAlreadyCaughtUp?: boolean;
  allCaughtUpAt?: string | null;
  /** Cron: persist all_caught_up_at when returning caught-up */
  persistCaughtUpFlag?: boolean;
};

export type DeliverResult =
  | { kind: "term"; term: TermCard }
  | { kind: "caughtUp" }
  | { kind: "silenced" };

async function clearCaughtUpFlag(client: Client, userId: string) {
  await client
    .from("telegram_links")
    .update({ all_caught_up_at: null, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .not("all_caught_up_at", "is", null);
}

async function maybePersistCaughtUp(
  client: Client,
  userId: string,
  options?: DeliverOptions,
): Promise<DeliverResult> {
  if (options?.skipIfAlreadyCaughtUp && options?.allCaughtUpAt) {
    return { kind: "silenced" };
  }

  if (options?.persistCaughtUpFlag) {
    await client.rpc("set_telegram_all_caught_up", { p_user_id: userId });
  }

  return { kind: "caughtUp" };
}

async function maybeRecordSend(client: Client, userId: string, options?: DeliverOptions) {
  if (options?.recordSend) {
    await client.rpc("record_telegram_send", { p_user_id: userId });
  }
}

/** Pick next unknown term, record shown, clear caught-up flag. */
export async function deliverNextTerm(
  client: Client,
  userId: string,
  options?: DeliverOptions,
): Promise<DeliverResult> {
  const stats = await getReviewPoolStatsForUser(client, userId, { domainIds: "all" }, "unknown");

  if (stats.total === 0) {
    const result = await maybePersistCaughtUp(client, userId, options);
    if (result.kind === "caughtUp") {
      await maybeRecordSend(client, userId, options);
    }
    return result;
  }

  await clearCaughtUpFlag(client, userId);

  const { cards } = await pickReviewTermsForUser(
    client,
    userId,
    { domainIds: "all" },
    "unknown",
    1,
  );
  const term = cards[0];

  if (!term) {
    const result = await maybePersistCaughtUp(client, userId, options);
    await maybeRecordSend(client, userId, options);
    return result;
  }

  try {
    await applyTermShown(client, userId, term.id, "admin");
  } catch (err) {
    console.error("Failed to record review outcome on term delivery", {
      userId,
      termId: term.id,
      err,
    });
  }

  await maybeRecordSend(client, userId, options);
  return { kind: "term", term };
}

export async function resolveUserIdByChatId(
  client: Client,
  chatId: number,
): Promise<string | null> {
  const { data, error } = await client
    .from("telegram_links")
    .select("user_id")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (error) throw error;
  return data?.user_id ?? null;
}

export { fetchTermCardForUser };
