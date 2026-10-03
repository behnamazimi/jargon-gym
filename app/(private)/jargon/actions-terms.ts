"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { setTermMarkedKnown } from "@/lib/mastery/known-state";
import { recordReveal, recordRead } from "@/lib/terms/review-outcome";
import { parseTermInput, type TermInput } from "@/lib/terms/term-schema";
import type { RelationshipSyncPayload } from "@/lib/terms/relationship-schema";
import { RelationshipMutationError, syncTermRelationships } from "@/lib/terms/relationships";
import {
  createTerm as createTermRecord,
  deleteTerm as deleteTermRecord,
  finishTerm as finishTermRecord,
  TermMutationError,
  updateTerm as updateTermRecord,
} from "@/lib/terms/terms";
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

export async function finishTerm(
  termId: string,
  input: { definition: string; category?: string | null },
): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  if (!input.definition.trim()) return { error: "Enter a definition." };

  try {
    const finished = await finishTermRecord(auth.supabase, termId, input);
    revalidatePath("/jargon");
    if (!finished) return { error: "That term was already finished or removed." };
    return {};
  } catch (err) {
    return { error: termMutationErrorMessage(err, "Couldn't save that definition. Try again.") };
  }
}

/** `savedAt` is the server time the term was gone, for local edit precedence
 *  (lib/library/overrides.ts). */
export async function deleteTerm(termId: string): Promise<{ error?: string; savedAt?: number }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    // No revalidation: callers remove the term locally, and a full re-render
    // of the page would ship every term back for one deletion.
    await deleteTermRecord(auth.supabase, termId);
    return { savedAt: Date.now() };
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
): Promise<{ error?: string; savedAt?: number }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    // No revalidation: every caller flips the mark locally (see
    // lib/library/overrides.ts), so re-rendering the page is waste.
    await setTermMarkedKnown(auth.supabase, auth.user.id, termId, marked);
    return { savedAt: Date.now() };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't update that. Try again.";
    return { error: message };
  }
}
