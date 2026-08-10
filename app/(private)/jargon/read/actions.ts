"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { recordRead } from "@/lib/jargon/review-outcome";
import { toReviewTerm } from "@/lib/review/mappers";
import type { ReviewTerm } from "@/lib/review/types";
import { fetchTermCardForUser, getReviewPoolStats, pickReviewTerms } from "@/lib/smart-queue";

export type NextReadTermResult = { error?: string; caughtUp?: true; term?: ReviewTerm };

/**
 * Deep-link entry: open one specific term (from Telegram, the widget, or a
 * direct link) without touching the queue.
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
    const card = await fetchTermCardForUser(auth.supabase, auth.user.id, termId);
    if (!card) {
      return { error: "That term isn't in your collection." };
    }

    if (!alreadyRead) {
      await recordRead(auth.supabase, auth.user.id, card.id, "session");
    }

    return { term: toReviewTerm(card) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load that term. Try again.";
    return { error: message };
  }
}

/** Web equivalent of Telegram /read: pull one unknown term, record it as read. */
export async function getNextReadTermAction(): Promise<NextReadTermResult> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    const stats = await getReviewPoolStats(
      auth.supabase,
      auth.user.id,
      { domainIds: "all" },
      "unknown",
      "read",
    );

    if (stats.total === 0) {
      return { caughtUp: true };
    }

    const { cards, pickMeta } = await pickReviewTerms(
      auth.supabase,
      auth.user.id,
      { domainIds: "all" },
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
      term: toReviewTerm(card, meta?.reasons, meta?.score),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load the next term. Try again.";
    return { error: message };
  }
}
