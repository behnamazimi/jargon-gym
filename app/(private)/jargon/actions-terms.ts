"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { setTermMarkedKnown } from "@/lib/jargon/known-state";
import { recordReveal, recordRead } from "@/lib/jargon/review-outcome";
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
  const auth = await requireAuthenticatedClient();
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
    return { error: termMutationErrorMessage(err, "Couldn't add that term. Try again.") };
  }
}

export async function updateTerm(
  termId: string,
  input: TermInput,
  relationshipSync?: RelationshipSyncPayload,
): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
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
    return { error: termMutationErrorMessage(err, "Couldn't save that term. Try again.") };
  }
}

export async function deleteTerm(termId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await deleteTermRecord(auth.supabase, termId);
    revalidatePath("/jargon");
    return {};
  } catch (err) {
    return { error: termMutationErrorMessage(err, "Couldn't delete that term. Try again.") };
  }
}

/** Jargon-page card open: deliberate exposure (Read tier). */
export async function recordTermReadAction(termId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await recordRead(auth.supabase, auth.user.id, termId, "session");
    return {};
  } catch (err) {
    console.error("recordTermReadAction failed", { termId, err });
    const message = err instanceof Error ? err.message : "Couldn't record that you saw this term.";
    return { error: message };
  }
}

/** Review card reveal: no TRACE state changes — the rating that follows is
 *  what actually updates recall_stability/recall_difficulty. */
export async function recordReviewRevealAction(termId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await recordReveal(auth.supabase, auth.user.id, termId, "session");
    return {};
  } catch (err) {
    console.error("recordReviewRevealAction failed", { termId, err });
    const message = err instanceof Error ? err.message : "Couldn't record that you saw this term.";
    return { error: message };
  }
}

/** Manual "I already know this" override — separate from TRACE's earned
 *  known label. Doesn't touch review_state's TRACE-math columns. */
export async function setTermMarkedKnownAction(
  termId: string,
  marked: boolean,
): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await setTermMarkedKnown(auth.supabase, auth.user.id, termId, marked);
    revalidatePath("/jargon");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't update that. Try again.";
    return { error: message };
  }
}
