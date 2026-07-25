import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { WidgetStateResponse, WidgetTerm } from "@/lib/widget/types";

type Client = SupabaseClient<Database>;
type DomainVisibility = Database["public"]["Enums"]["domain_visibility"];

export type CollectionDomainRow = {
  id: string;
  name: string;
  icon_url: string | null;
  description: string | null;
  visibility: DomainVisibility;
  owner_id: string;
  source: "owned" | "added";
  termCount: number;
  knownCount: number;
};

export async function fetchOwnedDomains(client: Client, userId: string) {
  const { data, error } = await client
    .from("domains")
    .select("id, name, icon_url, description, visibility, owner_id")
    .eq("owner_id", userId)
    .order("name");

  if (error) throw error;
  return data;
}

export async function fetchAddedDomains(client: Client, userId: string) {
  const { data, error } = await client
    .from("user_collection_domains")
    .select("domain_id, domains(id, name, icon_url, description, visibility, owner_id)")
    .eq("user_id", userId);

  if (error) throw error;

  return data
    .map((row) => row.domains)
    .filter((domain): domain is NonNullable<typeof domain> => domain !== null);
}

async function fetchDomainStats(client: Client, domainIds: string[], userId: string) {
  const stats = new Map<string, { termCount: number; knownCount: number }>();

  for (const domainId of domainIds) {
    stats.set(domainId, { termCount: 0, knownCount: 0 });
  }

  if (domainIds.length === 0) return stats;

  const { data: terms, error: termsError } = await client
    .from("terms")
    .select("id, domain_id")
    .in("domain_id", domainIds);

  if (termsError) throw termsError;

  const termToDomain = new Map<string, string>();

  for (const term of terms) {
    termToDomain.set(term.id, term.domain_id);
    const current = stats.get(term.domain_id);
    if (current) current.termCount += 1;
  }

  const termIds = terms.map((term) => term.id);
  if (termIds.length === 0) return stats;

  const { data: progress, error: progressError } = await client
    .from("user_progress")
    .select("term_id")
    .eq("user_id", userId)
    .eq("is_known", true)
    .in("term_id", termIds);

  if (progressError) throw progressError;

  for (const row of progress) {
    const domainId = termToDomain.get(row.term_id);
    if (!domainId) continue;
    const current = stats.get(domainId);
    if (current) current.knownCount += 1;
  }

  return stats;
}

export async function fetchUserCollection(
  client: Client,
  userId: string,
): Promise<CollectionDomainRow[]> {
  const [owned, added] = await Promise.all([
    fetchOwnedDomains(client, userId),
    fetchAddedDomains(client, userId),
  ]);

  const ownedRows = owned.map((d) => ({
    ...d,
    source: "owned" as const,
  }));

  const addedRows = added.map((d) => ({
    ...d,
    source: "added" as const,
  }));

  const combined = [...ownedRows, ...addedRows].sort((a, b) => a.name.localeCompare(b.name));
  const stats = await fetchDomainStats(
    client,
    combined.map((row) => row.id),
    userId,
  );

  return combined.map((row) => {
    const domainStats = stats.get(row.id) ?? { termCount: 0, knownCount: 0 };
    return {
      ...row,
      termCount: domainStats.termCount,
      knownCount: domainStats.knownCount,
    };
  });
}

export async function fetchActiveDomainIds(client: Client, userId: string) {
  const { data, error } = await client
    .from("user_active_domains")
    .select("domain_id")
    .eq("user_id", userId);

  if (error) throw error;
  return data.map((row) => row.domain_id);
}

export async function fetchTermsByDomain(client: Client, domainId: string) {
  const { data, error } = await client
    .from("terms")
    .select("*")
    .eq("domain_id", domainId)
    .order("category")
    .order("term");

  if (error) throw error;
  return data;
}

export async function fetchTermRelationshipsForTerms(client: Client, termIds: string[]) {
  if (termIds.length === 0) return [];

  const { data, error } = await client
    .from("term_relationships")
    .select("id, relationship_type, description, source_term_id, target_term_id")
    .in("source_term_id", termIds)
    .in("target_term_id", termIds);

  if (error) throw error;
  return data;
}

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
      { onConflict: "user_id,domain_id" },
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

export async function deleteDomain(client: Client, domainId: string) {
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
    .select("id, name, icon_url, description, visibility, owner_id")
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
        .select("id, name, icon_url, description, visibility, owner_id")
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
    .select("id, name, icon_url, description, visibility, owner_id")
    .single();

  if (error) throw error;
  return data;
}

export async function fetchSharedDomainsBrowse(client: Client, userId: string) {
  const [sharedResult, collectionResult] = await Promise.all([
    client
      .from("domains")
      .select("id, name, icon_url, description, owner_id, terms(count)")
      .eq("visibility", "shared")
      .neq("owner_id", userId)
      .order("name"),
    client.from("user_collection_domains").select("domain_id").eq("user_id", userId),
  ]);

  if (sharedResult.error) throw sharedResult.error;
  if (collectionResult.error) throw collectionResult.error;

  const inCollection = new Set(collectionResult.data.map((row) => row.domain_id));

  return sharedResult.data.map((row) => ({
    id: row.id,
    name: row.name,
    icon: row.icon_url ?? "",
    description: row.description ?? "",
    ownerId: row.owner_id,
    termCount: row.terms[0]?.count ?? 0,
    inCollection: inCollection.has(row.id),
  }));
}

export async function resolveReviewDomainIds(client: Client, userId: string) {
  const [collectionRows, activeDomainIds] = await Promise.all([
    fetchUserCollection(client, userId),
    fetchActiveDomainIds(client, userId),
  ]);

  const collectionIdSet = new Set(collectionRows.map((row) => row.id));
  const reviewDomainIds = activeDomainIds.filter((id) => collectionIdSet.has(id));

  return { reviewDomainIds, collectionRows };
}

export async function fetchWidgetState(
  client: Client,
  userId: string,
): Promise<WidgetStateResponse> {
  const { reviewDomainIds } = await resolveReviewDomainIds(client, userId);

  if (reviewDomainIds.length === 0) {
    return {
      terms: [],
      knownTermIds: [],
      activeDomainIds: [],
      totalCount: 0,
      knownCount: 0,
    };
  }

  const { data: termRows, error: termsError } = await client
    .from("terms")
    .select("id, term, category, definition, domain_id, domains(name)")
    .in("domain_id", reviewDomainIds)
    .order("term");

  if (termsError) throw termsError;

  const terms: WidgetTerm[] = termRows.map((row) => ({
    id: row.id,
    term: row.term,
    category: row.category,
    definition: row.definition,
    domainId: row.domain_id,
    domainName: row.domains?.name ?? "Jargon",
  }));

  const knownTermIds = await fetchKnownTermIdsForDomains(client, reviewDomainIds, userId);
  const knownSet = new Set(knownTermIds);

  return {
    terms,
    knownTermIds,
    activeDomainIds: reviewDomainIds,
    totalCount: terms.length,
    knownCount: terms.filter((t) => knownSet.has(t.id)).length,
  };
}

export async function fetchDomainIdForTerm(client: Client, termId: string) {
  const { data, error } = await client
    .from("terms")
    .select("domain_id")
    .eq("id", termId)
    .maybeSingle();

  if (error) throw error;
  return data?.domain_id ?? null;
}

export async function isTermInReviewPool(client: Client, userId: string, termId: string) {
  const { reviewDomainIds } = await resolveReviewDomainIds(client, userId);
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
