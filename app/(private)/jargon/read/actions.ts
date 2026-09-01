"use server";

import { after } from "next/server";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { recordRead } from "@/lib/jargon/review-outcome";
import { toReviewTerm } from "@/lib/review/mappers";
import type { ReviewTerm } from "@/lib/review/types";
import { fetchTermCardForUser, pickReadTermsForUser } from "@/lib/trace-queue";
import { createAdminClient } from "@/lib/supabase/admin";
import { listStudyCollections } from "@/lib/study/collections";

export type NextReadTermResult = {
  error?: string;
  caughtUp?: true;
  term?: ReviewTerm;
  revealed?: boolean;
};

export async function getReadSetupData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to continue." as const };
  }

  const collections = await listStudyCollections(auth.supabase, auth.user.id);
  return { collections };
}

function domainIdsForRead(domainId: string | undefined): string[] | "all" {
  return domainId && domainId !== "all" ? [domainId] : "all";
}

function scheduleRecordRead(userId: string, termId: string) {
  after(async () => {
    try {
      await recordRead(createAdminClient(), userId, termId, "admin");
    } catch (err) {
      console.error("Failed to record read:", err);
    }
  });
}

/**
 * Reveal gate: the client calls this the moment the user taps to reveal a
 * term's definition — not at delivery/fetch time. If the user never
 * reveals, nothing is recorded and the term stays eligible to resurface.
 */
export async function recordReadRevealAction(termId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  scheduleRecordRead(auth.user.id, termId);
  return {};
}

/**
 * Deep-link entry: open one specific term (from Telegram, the widget, or a
 * direct link) without touching the queue.
 *
 * Uses the same get_term_card RPC as Telegram /read so relationships and
 * every other field match that delivery path.
 *
 * `alreadyRead` covers Telegram's "Open in web" link and the widget's
 * "Read more" handoff, where the term was already recorded as read (and
 * revealed) at the point the user clicked through. Every other source (a
 * bare link) opens masked, requiring an explicit reveal tap here before
 * anything is recorded.
 */
export async function getReadTermByIdAction(
  termId: string,
  alreadyRead: boolean,
): Promise<NextReadTermResult> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    const admin = createAdminClient();
    const card = await fetchTermCardForUser(admin, auth.user.id, termId);
    if (!card) {
      return { error: "That term isn't in your collection." };
    }

    return { term: toReviewTerm(card), revealed: alreadyRead };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load that term. Try again.";
    return { error: message };
  }
}

/**
 * Web equivalent of Telegram /read: pull the next term off the Read queue,
 * ranked by lowest exposure first. Returned masked — the client only
 * records it as read once the user reveals it. Hydrates via get_term_card
 * (same RPC Telegram uses) so relationships match.
 *
 * `domainId` is a Read-page filter on top of the active pool. `"all"` (default)
 * matches Telegram /read. The RPC already intersects with collections that are
 * turned on, so an unknown id just yields an empty pick.
 */
export async function getNextReadTermAction(domainId: string = "all"): Promise<NextReadTermResult> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    const admin = createAdminClient();
    const scope = { domainIds: domainIdsForRead(domainId) };
    const [card] = await pickReadTermsForUser(admin, auth.user.id, scope, 1);

    if (!card) {
      return { caughtUp: true };
    }

    return {
      term: toReviewTerm(card),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load the next term. Try again.";
    return { error: message };
  }
}
