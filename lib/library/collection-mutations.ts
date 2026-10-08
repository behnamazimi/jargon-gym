import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { collectionInputToUpdateRow, type CollectionInput } from "@/lib/library/collection-schema";
import { CollectionMutationError } from "./collections";
import { escapeLike } from "@/lib/terms/like-escape";
import type { CollectionLanguage } from "@/lib/terms/languages";

type Client = SupabaseClient<Database>;
type CollectionVisibility = Database["public"]["Enums"]["collection_visibility"];

export async function addCollectionToCollection(
  client: Client,
  userId: string,
  collectionId: string,
) {
  const { error } = await client.from("user_collections").insert({
    user_id: userId,
    collection_id: collectionId,
  });

  if (error) throw error;

  await setCollectionActiveForReview(client, userId, collectionId, true);
}

export async function removeCollectionFromCollection(
  client: Client,
  userId: string,
  collectionId: string,
) {
  const { error: collectionError } = await client
    .from("user_collections")
    .delete()
    .eq("user_id", userId)
    .eq("collection_id", collectionId);

  if (collectionError) throw collectionError;

  await setCollectionActiveForReview(client, userId, collectionId, false);
}

export async function setCollectionActiveForReview(
  client: Client,
  userId: string,
  collectionId: string,
  active: boolean,
) {
  if (active) {
    const { error } = await client.from("user_active_collections").upsert(
      {
        user_id: userId,
        collection_id: collectionId,
      },
      { onConflict: "user_id,collection_id", ignoreDuplicates: true },
    );
    if (error) throw error;
    return;
  }

  const { error } = await client
    .from("user_active_collections")
    .delete()
    .eq("user_id", userId)
    .eq("collection_id", collectionId);

  if (error) throw error;
}

export async function setCollectionVisibility(
  client: Client,
  collectionId: string,
  visibility: CollectionVisibility,
) {
  const { error } = await client.from("collections").update({ visibility }).eq("id", collectionId);

  if (error) throw error;
}

export async function updateOwnedCollection(
  client: Client,
  userId: string,
  collectionId: string,
  input: CollectionInput,
) {
  const { data: collection, error: collectionError } = await client
    .from("collections")
    .select("id, owner_id, name")
    .eq("id", collectionId)
    .maybeSingle();

  if (collectionError) throw collectionError;

  if (!collection) {
    throw new CollectionMutationError("Collection not found.");
  }

  if (collection.owner_id !== userId) {
    throw new CollectionMutationError("You don't own this collection.");
  }

  const row = collectionInputToUpdateRow(input);

  if (row.name.toLowerCase() !== collection.name.toLowerCase()) {
    const { data: existing, error: existingError } = await client
      .from("collections")
      .select("id")
      .eq("owner_id", userId)
      .ilike("name", escapeLike(row.name))
      .neq("id", collectionId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      throw new CollectionMutationError(`You already have a collection named "${row.name}".`);
    }
  }

  const { error } = await client.from("collections").update(row).eq("id", collectionId);

  if (error) throw error;
}

export async function countCollectionSubscribers(
  client: Client,
  collectionId: string,
  ownerId: string,
): Promise<number> {
  const { count, error } = await client
    .from("user_collections")
    .select("*", { count: "exact", head: true })
    .eq("collection_id", collectionId)
    .neq("user_id", ownerId);

  if (error) throw error;
  return count ?? 0;
}

export async function deleteCollection(client: Client, collectionId: string) {
  const { data: collection, error: fetchError } = await client
    .from("collections")
    .select("is_builtin, is_public")
    .eq("id", collectionId)
    .single();
  if (fetchError) throw fetchError;

  if (collection.is_builtin || collection.is_public) {
    throw new Error("This collection is built-in or public, so it can't be deleted.");
  }

  const { error } = await client.from("collections").delete().eq("id", collectionId);
  if (error) throw error;
}

function isUniqueViolation(error: { code?: string }) {
  return error.code === "23505";
}

/** Creates a private, empty collection. Unlike `createOrGetOwnedCollection`, an
 *  existing name is an error, never a merge. */
export async function createOwnedCollection(
  client: Client,
  ownerId: string,
  input: { name: string; language: CollectionLanguage },
) {
  const name = input.name.trim();
  const duplicate = new CollectionMutationError(`You already have a collection named "${name}".`);

  const { data: existing, error: selectError } = await client
    .from("collections")
    .select("id")
    .eq("owner_id", ownerId)
    .ilike("name", escapeLike(name))
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) throw duplicate;

  const { data, error } = await client
    .from("collections")
    .insert({ name, owner_id: ownerId, visibility: "private", language: input.language })
    .select("id")
    .single();

  if (error) {
    if (isUniqueViolation(error)) throw duplicate;
    throw error;
  }

  try {
    await setCollectionActiveForReview(client, ownerId, data.id, true);
  } catch (err) {
    console.error("createOwnedCollection: could not mark the collection active", { err });
  }

  return data;
}
