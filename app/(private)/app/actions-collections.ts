"use server";

import { trackServer } from "@/lib/analytics/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import {
  addCollectionToCollection,
  countCollectionSubscribers,
  createOwnedCollection,
  deleteCollection,
  CollectionMutationError,
  removeCollectionFromCollection,
  setCollectionActiveForReview,
  setCollectionVisibility,
  updateOwnedCollection as updateOwnedCollectionRecord,
} from "@/lib/library/collections";
import {
  parseCollectionInput,
  parseNewCollectionInput,
  type CollectionInput,
  type NewCollectionInput,
} from "@/lib/library/collection-schema";
import {
  LOVE_ERROR_COPY,
  LOVE_FALLBACK_ERROR,
  ownerNoticeFor,
  REPORT_ERROR_COPY,
  REPORT_FALLBACK_ERROR,
  reportInputSchema,
} from "@/lib/collections/moderation";
import { resetCollectionProgress as clearStoredCollectionProgress } from "@/lib/mastery/known-state";
import { revalidatePath } from "next/cache";

export async function addToCollection(collectionId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await addCollectionToCollection(auth.supabase, auth.user.id, collectionId);
    trackServer(auth.user.id, "collection_added", {});
    revalidatePath("/app/library");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't add that collection. Try again.";
    return { error: message };
  }
}

export async function removeFromCollection(collectionId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await removeCollectionFromCollection(auth.supabase, auth.user.id, collectionId);
    revalidatePath("/app/library");
    return {};
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Couldn't remove that collection. Try again.";
    return { error: message };
  }
}

export async function toggleActiveForReview(
  collectionId: string,
  active: boolean,
): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await setCollectionActiveForReview(auth.supabase, auth.user.id, collectionId, active);
    revalidatePath("/app/library");
    return {};
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Couldn't update review status. Try again.";
    return { error: message };
  }
}

export async function shareCollection(collectionId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await setCollectionVisibility(auth.supabase, collectionId, "shared");
    revalidatePath("/app/library");
    return {};
  } catch (err) {
    if (isShareBlocked(err)) {
      return { error: await blockedShareMessage(auth.supabase, collectionId) };
    }
    const message =
      err instanceof Error ? err.message : "Couldn't share that collection. Try again.";
    return { error: message };
  }
}

function isShareBlocked(err: unknown) {
  return (
    typeof err === "object" && err !== null && "message" in err && err.message === "share_blocked"
  );
}

async function blockedShareMessage(supabase: SupabaseClient<Database>, collectionId: string) {
  const { data } = await supabase
    .from("collections")
    .select("share_block_reason")
    .eq("id", collectionId)
    .maybeSingle();
  return ownerNoticeFor(data?.share_block_reason);
}

export async function setCollectionLove(
  collectionId: string,
  loved: boolean,
): Promise<{ count?: number; error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  const { data, error } = await auth.supabase.rpc("my_set_collection_love", {
    p_collection_id: collectionId,
    p_loved: loved,
  });
  if (error) return { error: LOVE_ERROR_COPY[error.message] ?? LOVE_FALLBACK_ERROR };
  return { count: data };
}

export async function reportCollection(
  collectionId: string,
  reason: string,
  note: string,
): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  const parsed = reportInputSchema.safeParse({ reason, note });
  if (!parsed.success) return { error: REPORT_ERROR_COPY.invalid_report };

  const { error } = await auth.supabase.rpc("my_report_collection", {
    p_collection_id: collectionId,
    p_reason: parsed.data.reason,
    p_note: parsed.data.note,
  });
  if (error) return { error: REPORT_ERROR_COPY[error.message] ?? REPORT_FALLBACK_ERROR };
  revalidatePath("/app/library");
  return {};
}

export async function unshareCollection(collectionId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await setCollectionVisibility(auth.supabase, collectionId, "private");
    revalidatePath("/app/library");
    return {};
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Couldn't unshare that collection. Try again.";
    return { error: message };
  }
}

export async function getCollectionSubscriberCount(
  collectionId: string,
): Promise<{ count?: number; error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  const { data: collection, error: collectionError } = await auth.supabase
    .from("collections")
    .select("owner_id")
    .eq("id", collectionId)
    .maybeSingle();

  if (collectionError) {
    return { error: collectionError.message };
  }

  if (!collection) {
    return { error: "Collection not found." };
  }

  if (collection.owner_id !== auth.user.id) {
    return { error: "You don't own this collection." };
  }

  try {
    const count = await countCollectionSubscribers(auth.supabase, collectionId, auth.user.id);
    return { count };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load subscriber count.";
    return { error: message };
  }
}

function collectionMutationErrorMessage(err: unknown, fallback: string) {
  if (err instanceof CollectionMutationError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function updateOwnedCollection(
  collectionId: string,
  input: CollectionInput,
): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  const parsed = parseCollectionInput(input);
  if (!parsed.ok) return { error: parsed.error };

  try {
    await updateOwnedCollectionRecord(auth.supabase, auth.user.id, collectionId, parsed.data);
    revalidatePath("/app/library");
    return {};
  } catch (err) {
    return {
      error: collectionMutationErrorMessage(err, "Couldn't save that collection. Try again."),
    };
  }
}

export async function deleteOwnedCollection(collectionId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await deleteCollection(auth.supabase, collectionId);
    revalidatePath("/app/library");
    return {};
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Couldn't delete that collection. Try again.";
    return { error: message };
  }
}

export async function resetCollectionProgress(collectionId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await clearStoredCollectionProgress(auth.supabase, auth.user.id, collectionId);
    revalidatePath("/app/library");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't reset progress. Try again.";
    return { error: message };
  }
}

export async function createEmptyCollection(
  input: NewCollectionInput,
): Promise<{ error?: string; collectionId?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  const parsed = parseNewCollectionInput(input);
  if (!parsed.ok) return { error: parsed.error };

  try {
    const created = await createOwnedCollection(auth.supabase, auth.user.id, parsed.data);
    revalidatePath("/app/library");
    return { collectionId: created.id };
  } catch (err) {
    if (err instanceof CollectionMutationError) return { error: err.message };
    return { error: "Couldn't create that collection. Try again." };
  }
}
