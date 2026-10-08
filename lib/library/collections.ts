import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  applyCollectionStats,
  fetchCollectionStats,
  fetchCollectionStatsForUser,
} from "./collection-tally";

type Client = SupabaseClient<Database>;
type CollectionVisibility = Database["public"]["Enums"]["collection_visibility"];

export class CollectionMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CollectionMutationError";
  }
}

export type CollectionRow = {
  id: string;
  name: string;
  description: string | null;
  visibility: CollectionVisibility;
  language: string;
  owner_id: string;
  is_builtin: boolean;
  love_count: number;
  share_block_reason: string | null;
  source: "owned" | "added";
  termCount: number;
  unfinishedCount: number;
  knownCount: number;
  termsLearnedCount: number;
  markedKnownCount: number;
};

async function fetchOwnedCollections(client: Client, userId: string) {
  const { data, error } = await client
    .from("collections")
    .select(
      "id, name, description, visibility, language, owner_id, is_builtin, love_count, share_block_reason",
    )
    .eq("owner_id", userId)
    .order("name");

  if (error) throw error;
  return data;
}

async function fetchAddedCollections(client: Client, userId: string) {
  const { data, error } = await client
    .from("user_collections")
    .select(
      "collection_id, collections(id, name, description, visibility, language, owner_id, is_builtin, love_count, share_block_reason)",
    )
    .eq("user_id", userId);

  if (error) throw error;

  return data
    .map((row) => row.collections)
    .filter((collection): collection is NonNullable<typeof collection> => collection !== null);
}

function combineOwnedAndAdded(
  owned: Awaited<ReturnType<typeof fetchOwnedCollections>>,
  added: Awaited<ReturnType<typeof fetchAddedCollections>>,
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

/** The user's collections without their counts, sorted by name. */
export async function fetchUserCollections(client: Client, userId: string) {
  const [owned, added] = await Promise.all([
    fetchOwnedCollections(client, userId),
    fetchAddedCollections(client, userId),
  ]);
  return combineOwnedAndAdded(owned, added);
}

export async function fetchUserCollection(
  client: Client,
  userId: string,
): Promise<CollectionRow[]> {
  const combined = await fetchUserCollections(client, userId);
  const stats = await fetchCollectionStats(
    client,
    combined.map((row) => row.id),
  );

  return applyCollectionStats(combined, stats);
}

/** Service-role / admin client: collection for an explicit userId (Telegram, widget). */
export async function fetchUserCollectionForUser(
  client: Client,
  userId: string,
): Promise<CollectionRow[]> {
  const [owned, added] = await Promise.all([
    fetchOwnedCollections(client, userId),
    fetchAddedCollections(client, userId),
  ]);

  const combined = combineOwnedAndAdded(owned, added);
  const stats = await fetchCollectionStatsForUser(
    client,
    userId,
    combined.map((row) => row.id),
  );

  return applyCollectionStats(combined, stats);
}

export * from "./collection-mutations";
