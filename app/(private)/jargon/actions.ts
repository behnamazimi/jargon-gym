"use server";

import { createClient } from "@/lib/supabase/server";
import { loadJargonPageData } from "@/lib/jargon/load-jargon-page-data";
import {
  addDomainToCollection,
  deleteDomain,
  fetchSharedDomainsBrowse,
  removeDomainFromCollection,
  setDomainActiveForReview,
  setDomainVisibility,
} from "@/lib/jargon/queries";
import { upsertTermKnown } from "@/lib/jargon/queries";
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

export async function setTermKnown(termId: string, isKnown: boolean): Promise<{ error?: string }> {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await upsertTermKnown(auth.supabase, auth.user.id, termId, isKnown);
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

export async function loadSharedDomainsBrowse() {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return { error: auth.error, domains: [] };

  try {
    const domains = await fetchSharedDomainsBrowse(auth.supabase, auth.user.id);
    return { domains };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load shared domains.";
    return { error: message, domains: [] };
  }
}

export async function reloadJargonPageData(domainId?: string) {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    const data = await loadJargonPageData(auth.supabase, {
      userId: auth.user.id,
      selectedDomainId: domainId,
    });
    return { data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reload jargon data.";
    return { error: message };
  }
}
