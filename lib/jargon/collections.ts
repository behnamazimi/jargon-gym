import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  applyDomainStats,
  fetchDomainStats,
  fetchDomainStatsForUser,
} from "./collection-domain-tally";

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
  language: string;
  owner_id: string;
  source: "owned" | "added";
  termCount: number;
  knownCount: number;
  termsLearnedCount: number;
  markedKnownCount: number;
};

async function fetchOwnedDomains(client: Client, userId: string) {
  const { data, error } = await client
    .from("domains")
    .select("id, name, description, visibility, language, owner_id")
    .eq("owner_id", userId)
    .order("name");

  if (error) throw error;
  return data;
}

async function fetchAddedDomains(client: Client, userId: string) {
  const { data, error } = await client
    .from("user_collection_domains")
    .select("domain_id, domains(id, name, description, visibility, language, owner_id)")
    .eq("user_id", userId);

  if (error) throw error;

  return data
    .map((row) => row.domains)
    .filter((domain): domain is NonNullable<typeof domain> => domain !== null);
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

export * from "./collection-mutations";
