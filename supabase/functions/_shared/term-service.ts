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

function mapTermRow(row: Record<string, unknown>): TermRow {
  return {
    id: String(row.id),
    term: String(row.term),
    category: String(row.category),
    definition: String(row.definition),
    example: (row.example as string | null) ?? null,
    discussion: (row.discussion as string | null) ?? null,
    controversy: (row.controversy as string | null) ?? null,
    domain_id: String(row.domain_id),
    domain_name: String(row.domain_name),
    relationships: Array.isArray(row.relationships)
      ? (row.relationships as TermRow["relationships"])
      : [],
  };
}

export async function pickRandomUnknownTerm(
  supabase: SupabaseClient,
  userId: string,
): Promise<TermRow | null> {
  const { data, error } = await supabase.rpc("pick_random_unknown_term", {
    p_user_id: userId,
  });

  if (error) throw error;

  const row = (data?.[0] as Record<string, unknown> | undefined) ?? null;
  return row ? mapTermRow(row) : null;
}

export async function fetchTermById(
  supabase: SupabaseClient,
  userId: string,
  termId: string,
): Promise<TermRow | null> {
  const { data, error } = await supabase.rpc("get_term_card", {
    p_user_id: userId,
    p_term_id: termId,
  });

  if (error) throw error;

  const row = (data?.[0] as Record<string, unknown> | undefined) ?? null;
  return row ? mapTermRow(row) : null;
}

export async function sendTermCard(supabase: SupabaseClient, userId: string, chatId: number) {
  await clearCaughtUpFlag(supabase, userId);

  const term = await pickRandomUnknownTerm(supabase, userId);
  if (!term) {
    return { kind: "caught_up" as const };
  }

  await sendMessage(chatId, formatTermMessage(term), buildInlineKeyboard(term), supabase);
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

export type CollectionStats = {
  id: string;
  name: string;
  isActive: boolean;
  knownCount: number;
  totalCount: number;
  percentage: number;
};

export async function fetchCollectionStats(
  supabase: SupabaseClient,
  userId: string,
): Promise<CollectionStats[]> {
  // Get all review domains for the user
  const { data: domainIds, error: domainError } = await supabase.rpc("telegram_review_domain_ids", {
    p_user_id: userId,
  });

  if (domainError) throw domainError;

  const ids = (domainIds as string[]) ?? [];
  if (ids.length === 0) return [];

  // Get all active domain IDs
  const { data: activeDomains, error: activeError } = await supabase
    .from("user_active_domains")
    .select("domain_id")
    .eq("user_id", userId);

  if (activeError) throw activeError;

  const activeSet = new Set((activeDomains ?? []).map((d: { domain_id: string }) => d.domain_id));

  // Fetch domain names and term counts
  const { data: domains, error: domainsError } = await supabase
    .from("domains")
    .select("id, name")
    .in("id", ids);

  if (domainsError) throw domainsError;

  // Get term counts per domain
  const { data: termCounts, error: termsError } = await supabase
    .from("terms")
    .select("domain_id")
    .in("domain_id", ids);

  if (termsError) throw termsError;

  // Get known term counts per domain
  const { data: knownTerms, error: knownError } = await supabase
    .from("user_progress")
    .select("term_id, terms!inner(domain_id)")
    .eq("user_id", userId)
    .eq("is_known", true)
    .in("terms.domain_id", ids);

  if (knownError) throw knownError;

  // Count terms per domain
  const termCountMap = new Map<string, number>();
  (termCounts ?? []).forEach((term: { domain_id: string }) => {
    const count = termCountMap.get(term.domain_id) ?? 0;
    termCountMap.set(term.domain_id, count + 1);
  });

  // Count known terms per domain
  const knownCountMap = new Map<string, number>();
  (knownTerms ?? []).forEach((row: { terms: { domain_id: string } }) => {
    const domainId = (row.terms as unknown as { domain_id: string }).domain_id;
    const count = knownCountMap.get(domainId) ?? 0;
    knownCountMap.set(domainId, count + 1);
  });

  // Build stats array
  const stats: CollectionStats[] = (domains ?? []).map((domain: { id: string; name: string }) => {
    const totalCount = termCountMap.get(domain.id) ?? 0;
    const knownCount = knownCountMap.get(domain.id) ?? 0;
    const percentage = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;

    return {
      id: domain.id,
      name: domain.name,
      isActive: activeSet.has(domain.id),
      knownCount,
      totalCount,
      percentage,
    };
  });

  // Sort: active first, then by name
  stats.sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return stats;
}
