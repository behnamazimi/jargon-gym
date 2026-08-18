"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { recordRead } from "@/lib/jargon/review-outcome";
import { toReviewTerm } from "@/lib/review/mappers";
import type { ReviewTerm } from "@/lib/review/types";
import { fetchTermCardForUser } from "@/lib/smart-queue/hydrate";
import { pickReviewTermsForUser } from "@/lib/smart-queue/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { listStudyCollections } from "@/lib/study/collections";

export type NextReadTermResult = { error?: string; caughtUp?: true; term?: ReviewTerm };

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

/**
 * Deep-link entry: open one specific term (from Telegram, the widget, or a
 * direct link) without touching the queue.
 *
 * Uses the same get_term_card RPC as Telegram /read so relationships and
 * every other field match that delivery path.
 *
 * `alreadyRead` covers Telegram's "Open in web" link, where the term was
 * already recorded as read when the bot delivered it. Every other source
 * (widget click, a bare link) hasn't recorded that exposure yet, so it's
 * counted here.
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

    if (!alreadyRead) {
      await recordRead(auth.supabase, auth.user.id, card.id, "session");
    }

    return { term: toReviewTerm(card, "unknown") };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load that term. Try again.";
    return { error: message };
  }
}

/**
 * Web equivalent of Telegram /read: pull one unknown term, record it as read.
 * Hydrates via get_term_card (same RPC Telegram uses) so relationships match.
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
    const { cards, pickMeta } = await pickReviewTermsForUser(
      admin,
      auth.user.id,
      { domainIds: domainIdsForRead(domainId) },
      "unknown",
      1,
      "read",
    );
    const card = cards[0];
    const meta = pickMeta[0];

    if (!card) {
      return { caughtUp: true };
    }

    await recordRead(auth.supabase, auth.user.id, card.id, "session");

    return {
      term: toReviewTerm(card, "unknown", meta?.reasons, meta?.score),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load the next term. Try again.";
    return { error: message };
  }
}
