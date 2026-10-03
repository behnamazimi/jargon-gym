import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { domainInputToUpdateRow, type DomainInput } from "@/lib/library/domain-schema";
import { DomainMutationError } from "./collections";
import { escapeLike } from "@/lib/terms/like-escape";
import type { DomainLanguage } from "@/lib/terms/languages";

type Client = SupabaseClient<Database>;
type DomainVisibility = Database["public"]["Enums"]["domain_visibility"];

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
      .ilike("name", escapeLike(row.name))
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

function isUniqueViolation(error: { code?: string }) {
  return error.code === "23505";
}

/** Creates a private, empty collection. Unlike `createOrGetOwnedDomain`, an
 *  existing name is an error, never a merge. */
export async function createOwnedDomain(
  client: Client,
  ownerId: string,
  input: { name: string; language: DomainLanguage },
) {
  const name = input.name.trim();
  const duplicate = new DomainMutationError(`You already have a collection named "${name}".`);

  const { data: existing, error: selectError } = await client
    .from("domains")
    .select("id")
    .eq("owner_id", ownerId)
    .ilike("name", escapeLike(name))
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) throw duplicate;

  const { data, error } = await client
    .from("domains")
    .insert({ name, owner_id: ownerId, visibility: "private", language: input.language })
    .select("id")
    .single();

  if (error) {
    if (isUniqueViolation(error)) throw duplicate;
    throw error;
  }

  try {
    await setDomainActiveForReview(client, ownerId, data.id, true);
  } catch (err) {
    console.error("createOwnedDomain: could not mark the collection active", { err });
  }

  return data;
}
