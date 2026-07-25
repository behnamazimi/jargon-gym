import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchUserCollection } from "./collections";

type Client = SupabaseClient<Database>;

export async function fetchKnownTermIdsForDomains(
  client: Client,
  domainIds: string[],
  userId: string,
) {
  if (domainIds.length === 0) return [];

  const { data: terms, error: termsError } = await client
    .from("terms")
    .select("id")
    .in("domain_id", domainIds);

  if (termsError) throw termsError;
  if (terms.length === 0) return [];

  const termIds = terms.map((t) => t.id);
  const { data, error } = await client
    .from("user_progress")
    .select("term_id")
    .eq("user_id", userId)
    .eq("is_known", true)
    .in("term_id", termIds);

  if (error) throw error;
  return data.map((row) => row.term_id);
}

export async function upsertTermKnown(
  client: Client,
  userId: string,
  termId: string,
  isKnown: boolean,
) {
  if (!isKnown) {
    const { error } = await client
      .from("user_progress")
      .delete()
      .eq("user_id", userId)
      .eq("term_id", termId);

    if (error) throw error;
    return;
  }

  const { error } = await client.from("user_progress").upsert(
    {
      user_id: userId,
      term_id: termId,
      is_known: true,
    },
    { onConflict: "user_id,term_id" },
  );

  if (error) throw error;
}

async function fetchReviewDomainIdsFromRpc(client: Client, userId: string) {
  const { data, error } = await client.rpc("telegram_review_domain_ids", {
    p_user_id: userId,
  });

  if (error) throw error;
  return data ?? [];
}

export async function resolveReviewDomainIds(client: Client, userId: string) {
  const [collectionRows, reviewDomainIds] = await Promise.all([
    fetchUserCollection(client, userId),
    client.rpc("my_review_domain_ids").then(({ data, error }) => {
      if (error) throw error;
      return data ?? [];
    }),
  ]);

  return { reviewDomainIds, collectionRows };
}

export async function resolveReviewDomainIdsForUser(client: Client, userId: string) {
  const [collectionRows, reviewDomainIds] = await Promise.all([
    fetchUserCollection(client, userId),
    fetchReviewDomainIdsFromRpc(client, userId),
  ]);

  return { reviewDomainIds, collectionRows };
}

export async function isTermInReviewPool(client: Client, userId: string, termId: string) {
  const { reviewDomainIds } = await resolveReviewDomainIdsForUser(client, userId);
  if (reviewDomainIds.length === 0) return false;

  const { data, error } = await client
    .from("terms")
    .select("id")
    .eq("id", termId)
    .in("domain_id", reviewDomainIds)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}
