import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { domainInputToUpdateRow, type DomainInput } from "@/lib/jargon/domain-schema";
import { computeTraceSnapshot, type TraceState } from "@/lib/trace";

type Client = SupabaseClient<Database>;
type DomainVisibility = Database["public"]["Enums"]["domain_visibility"];

export class DomainMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainMutationError";
  }
}

export type CollectionDomainRow = {
  id: string;
  name: string;
  description: string | null;
  visibility: DomainVisibility;
  owner_id: string;
  source: "owned" | "added";
  termCount: number;
  knownCount: number;
  termsLearnedCount: number;
};

async function fetchOwnedDomains(client: Client, userId: string) {
  const { data, error } = await client
    .from("domains")
    .select("id, name, description, visibility, owner_id")
    .eq("owner_id", userId)
    .order("name");

  if (error) throw error;
  return data;
}

async function fetchAddedDomains(client: Client, userId: string) {
  const { data, error } = await client
    .from("user_collection_domains")
    .select("domain_id, domains(id, name, description, visibility, owner_id)")
    .eq("user_id", userId);

  if (error) throw error;

  return data
    .map((row) => row.domains)
    .filter((domain): domain is NonNullable<typeof domain> => domain !== null);
}

type ProgressStateRow = {
  domain_id: string;
  read_count: number;
  last_read_at: string | null;
  recall_stability: number | null;
  recall_difficulty: number | null;
  review_recall_count: number;
  last_review_recall_at: string | null;
  quiz_knowledge_posterior: number | null;
  quiz_test_count: number;
  last_quiz_tested_at: string | null;
  ever_mastered_at: string | null;
};

function toTraceState(row: ProgressStateRow): TraceState {
  return {
    readCount: row.read_count,
    lastReadAt: row.last_read_at ? new Date(row.last_read_at) : null,
    recallStability: row.recall_stability,
    recallDifficulty: row.recall_difficulty,
    reviewRecallCount: row.review_recall_count,
    lastReviewRecallAt: row.last_review_recall_at ? new Date(row.last_review_recall_at) : null,
    quizKnowledgePosterior: row.quiz_knowledge_posterior,
    quizTestCount: row.quiz_test_count,
    lastQuizTestedAt: row.last_quiz_tested_at ? new Date(row.last_quiz_tested_at) : null,
  };
}

/** "known" is a read-only label derived live from Mastery_adjusted, not a
 *  stored row — replaces the old known_at-row-presence tally. `ever_mastered_at`
 *  is the companion permanent high-water mark: once set it's never cleared,
 *  even as the live label later decays back below the known threshold. */
function tallyDomainStats(domainIds: string[], data: ProgressStateRow[]) {
  const stats = new Map<
    string,
    { termCount: number; knownCount: number; termsLearnedCount: number }
  >();
  const now = new Date();

  for (const domainId of domainIds) {
    stats.set(domainId, { termCount: 0, knownCount: 0, termsLearnedCount: 0 });
  }

  for (const row of data) {
    const current = stats.get(row.domain_id);
    if (!current) continue;
    current.termCount += 1;
    if (computeTraceSnapshot(toTraceState(row), now).knownLabel === "known") {
      current.knownCount += 1;
    }
    if (row.ever_mastered_at !== null) {
      current.termsLearnedCount += 1;
    }
  }

  return stats;
}

async function fetchDomainStats(client: Client, domainIds: string[]) {
  if (domainIds.length === 0) return tallyDomainStats(domainIds, []);

  const { data, error } = await client.rpc("my_progress_state_by_domain", {
    p_domain_ids: domainIds,
  });

  if (error) throw error;
  return tallyDomainStats(domainIds, data);
}

/** Service-role / admin client: stats for an explicit userId (no `auth.uid()` session). */
async function fetchDomainStatsForUser(client: Client, userId: string, domainIds: string[]) {
  if (domainIds.length === 0) return tallyDomainStats(domainIds, []);

  const { data, error } = await client.rpc("progress_state_by_domain", {
    p_user_id: userId,
    p_domain_ids: domainIds,
  });

  if (error) throw error;
  return tallyDomainStats(domainIds, data);
}

function combineOwnedAndAdded(
  owned: Awaited<ReturnType<typeof fetchOwnedDomains>>,
  added: Awaited<ReturnType<typeof fetchAddedDomains>>,
) {
  const ownedRows = owned.map((d) => ({
    ...d,
    source: "owned" as const,
  }));

  const addedRows = added.map((d) => ({
    ...d,
    source: "added" as const,
  }));

  return [...ownedRows, ...addedRows].sort((a, b) => a.name.localeCompare(b.name));
}

function applyDomainStats(
  rows: ReturnType<typeof combineOwnedAndAdded>,
  stats: Map<string, { termCount: number; knownCount: number; termsLearnedCount: number }>,
): CollectionDomainRow[] {
  return rows.map((row) => {
    const domainStats = stats.get(row.id) ?? {
      termCount: 0,
      knownCount: 0,
      termsLearnedCount: 0,
    };
    return {
      ...row,
      termCount: domainStats.termCount,
      knownCount: domainStats.knownCount,
      termsLearnedCount: domainStats.termsLearnedCount,
    };
  });
}

export async function fetchUserCollection(
  client: Client,
  userId: string,
): Promise<CollectionDomainRow[]> {
  const [owned, added] = await Promise.all([
    fetchOwnedDomains(client, userId),
    fetchAddedDomains(client, userId),
  ]);

  const combined = combineOwnedAndAdded(owned, added);
  const stats = await fetchDomainStats(
    client,
    combined.map((row) => row.id),
  );

  return applyDomainStats(combined, stats);
}

/** Service-role / admin client: collection for an explicit userId (Telegram, widget). */
export async function fetchUserCollectionForUser(
  client: Client,
  userId: string,
): Promise<CollectionDomainRow[]> {
  const [owned, added] = await Promise.all([
    fetchOwnedDomains(client, userId),
    fetchAddedDomains(client, userId),
  ]);

  const combined = combineOwnedAndAdded(owned, added);
  const stats = await fetchDomainStatsForUser(
    client,
    userId,
    combined.map((row) => row.id),
  );

  return applyDomainStats(combined, stats);
}

export async function addDomainToCollection(client: Client, userId: string, domainId: string) {
  const { error } = await client.from("user_collection_domains").insert({
    user_id: userId,
    domain_id: domainId,
  });

  if (error) throw error;

  await setDomainActiveForReview(client, userId, domainId, true);
}

export async function removeDomainFromCollection(client: Client, userId: string, domainId: string) {
  const { error: collectionError } = await client
    .from("user_collection_domains")
    .delete()
    .eq("user_id", userId)
    .eq("domain_id", domainId);

  if (collectionError) throw collectionError;

  await setDomainActiveForReview(client, userId, domainId, false);
}

export async function setDomainActiveForReview(
  client: Client,
  userId: string,
  domainId: string,
  active: boolean,
) {
  if (active) {
    const { error } = await client.from("user_active_domains").upsert(
      {
        user_id: userId,
        domain_id: domainId,
      },
      { onConflict: "user_id,domain_id", ignoreDuplicates: true },
    );
    if (error) throw error;
    return;
  }

  const { error } = await client
    .from("user_active_domains")
    .delete()
    .eq("user_id", userId)
    .eq("domain_id", domainId);

  if (error) throw error;
}

export async function setDomainVisibility(
  client: Client,
  domainId: string,
  visibility: DomainVisibility,
) {
  const { error } = await client.from("domains").update({ visibility }).eq("id", domainId);

  if (error) throw error;
}

export async function updateOwnedDomain(
  client: Client,
  userId: string,
  domainId: string,
  input: DomainInput,
) {
  const { data: domain, error: domainError } = await client
    .from("domains")
    .select("id, owner_id, name")
    .eq("id", domainId)
    .maybeSingle();

  if (domainError) throw domainError;

  if (!domain) {
    throw new DomainMutationError("Collection not found.");
  }

  if (domain.owner_id !== userId) {
    throw new DomainMutationError("You don't own this collection.");
  }

  const row = domainInputToUpdateRow(input);

  if (row.name.toLowerCase() !== domain.name.toLowerCase()) {
    const { data: existing, error: existingError } = await client
      .from("domains")
      .select("id")
      .eq("owner_id", userId)
      .ilike("name", row.name)
      .neq("id", domainId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      throw new DomainMutationError(`You already have a collection named "${row.name}".`);
    }
  }

  const { error } = await client.from("domains").update(row).eq("id", domainId);

  if (error) throw error;
}

export async function countDomainCollectionSubscribers(
  client: Client,
  domainId: string,
  ownerId: string,
): Promise<number> {
  const { count, error } = await client
    .from("user_collection_domains")
    .select("*", { count: "exact", head: true })
    .eq("domain_id", domainId)
    .neq("user_id", ownerId);

  if (error) throw error;
  return count ?? 0;
}

export async function deleteDomain(client: Client, domainId: string) {
  const { data: domain, error: fetchError } = await client
    .from("domains")
    .select("is_builtin, is_public")
    .eq("id", domainId)
    .single();
  if (fetchError) throw fetchError;

  if (domain.is_builtin || domain.is_public) {
    throw new Error(
      "This collection is marked built-in and can't be deleted. Unmark it in admin first.",
    );
  }

  const { error } = await client.from("domains").delete().eq("id", domainId);
  if (error) throw error;
}

export async function createOrGetOwnedDomain(
  client: Client,
  ownerId: string,
  name: string,
  description?: string | null,
) {
  const { data: existing, error: selectError } = await client
    .from("domains")
    .select("id, name, description, visibility, owner_id")
    .eq("owner_id", ownerId)
    .ilike("name", name)
    .maybeSingle();

  if (selectError) throw selectError;

  const normalizedDescription = description?.trim() || null;

  if (existing) {
    if (normalizedDescription && normalizedDescription !== (existing.description ?? "")) {
      const { data, error } = await client
        .from("domains")
        .update({ description: normalizedDescription })
        .eq("id", existing.id)
        .select("id, name, description, visibility, owner_id")
        .single();

      if (error) throw error;
      return data;
    }

    return existing;
  }

  const { data, error } = await client
    .from("domains")
    .insert({
      name,
      owner_id: ownerId,
      visibility: "private",
      description: normalizedDescription,
    })
    .select("id, name, description, visibility, owner_id")
    .single();

  if (error) throw error;
  return data;
}
