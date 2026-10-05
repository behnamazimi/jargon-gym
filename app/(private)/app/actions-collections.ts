"use server";

import { trackServer } from "@/lib/analytics/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import {
  addDomainToCollection,
  countDomainCollectionSubscribers,
  createOwnedDomain,
  deleteDomain,
  DomainMutationError,
  removeDomainFromCollection,
  setDomainActiveForReview,
  setDomainVisibility,
  updateOwnedDomain as updateOwnedDomainRecord,
} from "@/lib/library/collections";
import {
  parseDomainInput,
  parseNewCollectionInput,
  type DomainInput,
  type NewCollectionInput,
} from "@/lib/library/domain-schema";
import {
  LOVE_ERROR_COPY,
  LOVE_FALLBACK_ERROR,
  ownerNoticeFor,
  REPORT_ERROR_COPY,
  REPORT_FALLBACK_ERROR,
  reportInputSchema,
} from "@/lib/collections/moderation";
import { resetDomainProgress } from "@/lib/mastery/known-state";
import { revalidatePath } from "next/cache";

export async function addToCollection(domainId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await addDomainToCollection(auth.supabase, auth.user.id, domainId);
    trackServer(auth.user.id, "collection_added", {});
    revalidatePath("/app/library");
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
    revalidatePath("/app/library");
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
    revalidatePath("/app/library");
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
    revalidatePath("/app/library");
    return {};
  } catch (err) {
    if (isShareBlocked(err)) {
      return { error: await blockedShareMessage(auth.supabase, domainId) };
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

async function blockedShareMessage(supabase: SupabaseClient<Database>, domainId: string) {
  const { data } = await supabase
    .from("domains")
    .select("share_block_reason")
    .eq("id", domainId)
    .maybeSingle();
  return ownerNoticeFor(data?.share_block_reason);
}

export async function setCollectionLove(
  domainId: string,
  loved: boolean,
): Promise<{ count?: number; error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  const { data, error } = await auth.supabase.rpc("my_set_collection_love", {
    p_domain_id: domainId,
    p_loved: loved,
  });
  if (error) return { error: LOVE_ERROR_COPY[error.message] ?? LOVE_FALLBACK_ERROR };
  return { count: data };
}

export async function reportCollection(
  domainId: string,
  reason: string,
  note: string,
): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  const parsed = reportInputSchema.safeParse({ reason, note });
  if (!parsed.success) return { error: REPORT_ERROR_COPY.invalid_report };

  const { error } = await auth.supabase.rpc("my_report_collection", {
    p_domain_id: domainId,
    p_reason: parsed.data.reason,
    p_note: parsed.data.note,
  });
  if (error) return { error: REPORT_ERROR_COPY[error.message] ?? REPORT_FALLBACK_ERROR };
  revalidatePath("/app/library");
  return {};
}

export async function unshareDomain(domainId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await setDomainVisibility(auth.supabase, domainId, "private");
    revalidatePath("/app/library");
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
    revalidatePath("/app/library");
    return {};
  } catch (err) {
    return {
      error: domainMutationErrorMessage(err, "Couldn't save that collection. Try again."),
    };
  }
}

export async function deleteOwnedDomain(domainId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await deleteDomain(auth.supabase, domainId);
    revalidatePath("/app/library");
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
    revalidatePath("/app/library");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't reset progress. Try again.";
    return { error: message };
  }
}

export async function createEmptyCollection(
  input: NewCollectionInput,
): Promise<{ error?: string; domainId?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  const parsed = parseNewCollectionInput(input);
  if (!parsed.ok) return { error: parsed.error };

  try {
    const created = await createOwnedDomain(auth.supabase, auth.user.id, parsed.data);
    revalidatePath("/app/library");
    return { domainId: created.id };
  } catch (err) {
    if (err instanceof DomainMutationError) return { error: err.message };
    return { error: "Couldn't create that collection. Try again." };
  }
}
