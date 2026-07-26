"use server";

import { createClient } from "@/lib/supabase/server";
import {
  addDomainToCollection,
  countDomainCollectionSubscribers,
  deleteDomain,
  removeDomainFromCollection,
  setDomainActiveForReview,
  setDomainVisibility,
} from "@/lib/jargon/collections";
import { clearTermKnown, markTermKnown } from "@/lib/jargon/known-state";
import { parseTermInput, type TermInput } from "@/lib/jargon/term-schema";
import type { RelationshipSyncPayload } from "@/lib/jargon/relationship-schema";
import { RelationshipMutationError, syncTermRelationships } from "@/lib/jargon/relationships";
import {
  createTerm as createTermRecord,
  deleteTerm as deleteTermRecord,
  TermMutationError,
  updateTerm as updateTermRecord,
} from "@/lib/jargon/terms";
import { revalidatePath } from "next/cache";

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "You must be logged in." as const };
  }

  return { supabase, user };
}

function termMutationErrorMessage(err: unknown, fallback: string) {
  if (err instanceof TermMutationError || err instanceof RelationshipMutationError)
    return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function createTerm(
  domainId: string,
  input: TermInput,
  relationshipSync?: Pick<RelationshipSyncPayload, "create">,
): Promise<{ error?: string; termId?: string }> {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  const parsed = parseTermInput(input);
  if (!parsed.ok) return { error: parsed.error };

  try {
    const created = await createTermRecord(auth.supabase, domainId, auth.user.id, parsed.data);

    if (relationshipSync?.create.length) {
      await syncTermRelationships(auth.supabase, auth.user.id, created.id, {
        create: relationshipSync.create,
        update: [],
        deleteIds: [],
      });
    }

    revalidatePath("/jargon");
    return { termId: created.id };
  } catch (err) {
    return { error: termMutationErrorMessage(err, "Failed to create term.") };
  }
}

export async function updateTerm(
  termId: string,
  input: TermInput,
  relationshipSync?: RelationshipSyncPayload,
): Promise<{ error?: string }> {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  const parsed = parseTermInput(input);
  if (!parsed.ok) return { error: parsed.error };

  try {
    await updateTermRecord(auth.supabase, termId, parsed.data);

    if (relationshipSync) {
      await syncTermRelationships(auth.supabase, auth.user.id, termId, relationshipSync);
    }

    revalidatePath("/jargon");
    return {};
  } catch (err) {
    return { error: termMutationErrorMessage(err, "Failed to update term.") };
  }
}

export async function deleteTerm(termId: string): Promise<{ error?: string }> {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await deleteTermRecord(auth.supabase, termId);
    revalidatePath("/jargon");
    return {};
  } catch (err) {
    return { error: termMutationErrorMessage(err, "Failed to delete term.") };
  }
}

export async function setTermKnown(termId: string, isKnown: boolean): Promise<{ error?: string }> {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    if (isKnown) {
      await markTermKnown(auth.supabase, termId);
    } else {
      await clearTermKnown(auth.supabase, auth.user.id, termId);
    }
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update progress.";
    return { error: message };
  }
}

export async function addToCollection(domainId: string): Promise<{ error?: string }> {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await addDomainToCollection(auth.supabase, auth.user.id, domainId);
    revalidatePath("/jargon");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add domain to collection.";
    return { error: message };
  }
}

export async function removeFromCollection(domainId: string): Promise<{ error?: string }> {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await removeDomainFromCollection(auth.supabase, auth.user.id, domainId);
    revalidatePath("/jargon");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to remove domain from collection.";
    return { error: message };
  }
}

export async function toggleActiveForReview(
  domainId: string,
  active: boolean,
): Promise<{ error?: string }> {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await setDomainActiveForReview(auth.supabase, auth.user.id, domainId, active);
    revalidatePath("/jargon");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update active review status.";
    return { error: message };
  }
}

export async function shareDomain(domainId: string): Promise<{ error?: string }> {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await setDomainVisibility(auth.supabase, domainId, "shared");
    revalidatePath("/jargon");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to share domain.";
    return { error: message };
  }
}

export async function unshareDomain(domainId: string): Promise<{ error?: string }> {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await setDomainVisibility(auth.supabase, domainId, "private");
    revalidatePath("/jargon");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to unshare domain.";
    return { error: message };
  }
}

export async function getDomainSubscriberCount(
  domainId: string,
): Promise<{ count?: number; error?: string }> {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  const { data: domain, error: domainError } = await auth.supabase
    .from("domains")
    .select("owner_id")
    .eq("id", domainId)
    .maybeSingle();

  if (domainError) {
    return { error: domainError.message };
  }

  if (!domain) {
    return { error: "Domain not found." };
  }

  if (domain.owner_id !== auth.user.id) {
    return { error: "You do not own this domain." };
  }

  try {
    const count = await countDomainCollectionSubscribers(auth.supabase, domainId, auth.user.id);
    return { count };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load subscriber count.";
    return { error: message };
  }
}

export async function deleteOwnedDomain(domainId: string): Promise<{ error?: string }> {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await deleteDomain(auth.supabase, domainId);
    revalidatePath("/jargon");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete domain.";
    return { error: message };
  }
}
