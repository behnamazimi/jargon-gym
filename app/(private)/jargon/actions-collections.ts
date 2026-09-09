"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import {
  addDomainToCollection,
  countDomainCollectionSubscribers,
  deleteDomain,
  DomainMutationError,
  removeDomainFromCollection,
  setDomainActiveForReview,
  setDomainVisibility,
  updateOwnedDomain as updateOwnedDomainRecord,
} from "@/lib/jargon/collections";
import { parseDomainInput, type DomainInput } from "@/lib/jargon/domain-schema";
import { resetDomainProgress } from "@/lib/jargon/known-state";
import { revalidatePath } from "next/cache";

export async function addToCollection(domainId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await addDomainToCollection(auth.supabase, auth.user.id, domainId);
    revalidatePath("/jargon");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't add that collection. Try again.";
    return { error: message };
  }
}

export async function removeFromCollection(domainId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await removeDomainFromCollection(auth.supabase, auth.user.id, domainId);
    revalidatePath("/jargon");
    return {};
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Couldn't remove that collection. Try again.";
    return { error: message };
  }
}

export async function toggleActiveForReview(
  domainId: string,
  active: boolean,
): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await setDomainActiveForReview(auth.supabase, auth.user.id, domainId, active);
    revalidatePath("/jargon");
    return {};
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Couldn't update review status. Try again.";
    return { error: message };
  }
}

export async function shareDomain(domainId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await setDomainVisibility(auth.supabase, domainId, "shared");
    revalidatePath("/jargon");
    return {};
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Couldn't share that collection. Try again.";
    return { error: message };
  }
}

export async function unshareDomain(domainId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await setDomainVisibility(auth.supabase, domainId, "private");
    revalidatePath("/jargon");
    return {};
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Couldn't unshare that collection. Try again.";
    return { error: message };
  }
}

export async function getDomainSubscriberCount(
  domainId: string,
): Promise<{ count?: number; error?: string }> {
  const auth = await requireAuthenticatedClient();
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
    return { error: "Collection not found." };
  }

  if (domain.owner_id !== auth.user.id) {
    return { error: "You don't own this collection." };
  }

  try {
    const count = await countDomainCollectionSubscribers(auth.supabase, domainId, auth.user.id);
    return { count };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load subscriber count.";
    return { error: message };
  }
}

function domainMutationErrorMessage(err: unknown, fallback: string) {
  if (err instanceof DomainMutationError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function updateOwnedDomain(
  domainId: string,
  input: DomainInput,
): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  const parsed = parseDomainInput(input);
  if (!parsed.ok) return { error: parsed.error };

  try {
    await updateOwnedDomainRecord(auth.supabase, auth.user.id, domainId, parsed.data);
    revalidatePath("/jargon");
    return {};
  } catch (err) {
    return { error: domainMutationErrorMessage(err, "Couldn't save that collection. Try again.") };
  }
}

export async function deleteOwnedDomain(domainId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await deleteDomain(auth.supabase, domainId);
    revalidatePath("/jargon");
    return {};
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Couldn't delete that collection. Try again.";
    return { error: message };
  }
}

export async function resetCollectionProgress(domainId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await resetDomainProgress(auth.supabase, auth.user.id, domainId);
    revalidatePath("/jargon");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't reset progress. Try again.";
    return { error: message };
  }
}
