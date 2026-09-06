"use server";

import { after } from "next/server";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { recordRead } from "@/lib/jargon/review-outcome";
import { getNarrationAccessForUser } from "@/lib/narration/access";
import { toReviewTerm } from "@/lib/review/mappers";
import type { ReviewTerm } from "@/lib/review/types";
import { fetchTermCardForUser, pickReadTermsForUser } from "@/lib/trace-queue";
import { createAdminClient } from "@/lib/supabase/admin";
import { listStudyCollections } from "@/lib/study/collections";

export type ReadTermByIdResult = {
  error?: string;
  term?: ReviewTerm;
  revealed?: boolean;
};

/** Seeds a useReadQueue instance (components/jargon/read/use-read-queue.ts)
 *  from the server — either a deep-linked single term or the first batch
 *  off the regular queue, built by the Read page's server component. */
export type ReadQueueSeed = {
  error?: string;
  caughtUp?: boolean;
  terms: ReviewTerm[];
  revealedTermIds?: string[];
};

export async function getReadSetupData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to continue." as const };
  }

  const [collections, narrationAccess] = await Promise.all([
    listStudyCollections(auth.supabase, auth.user.id),
    getNarrationAccessForUser(auth.supabase, auth.user.id),
  ]);

  return { collections, narrationAccess };
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
 * Reveal gate: the client calls this once a term counts as read — not at
 * delivery/fetch time. If the user never reaches that point, nothing is
 * recorded and the term stays eligible to resurface. What counts as
 * "reached" differs by caller: the paged Read view calls this the moment
 * the user taps to reveal the definition; the fullscreen focus-mode feed
 * (which shows definitions unmasked) calls this once a term scrolls to
 * ~50% viewport visibility instead.
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
): Promise<ReadTermByIdResult> {
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
 * Web equivalent of Telegram /read: pull the next batch off the Read
 * queue, ranked by lowest exposure first. Returned masked — the client
 * only records a read once the user reveals/scroll-exposes it. Hydrates
 * via get_term_card (same RPC Telegram uses) so relationships match.
 *
 * The one fetch path both Read surfaces (paged view and fullscreen feed)
 * use via useReadQueue (components/jargon/read/use-read-queue.ts) — the
 * paged view only ever needs one term at a time, but takes the same
 * batch so both surfaces share one queue and one prefetch mechanism.
 *
 * `domainId` is a Read-page filter on top of the active pool. `"all"` (default)
 * matches Telegram /read. The RPC already intersects with collections that are
 * turned on, so an unknown id just yields an empty pick.
 */
const READ_FEED_BATCH_SIZE = 8;

export type ReadFeedBatchResult = {
  error?: string;
  caughtUp?: boolean;
  terms: ReviewTerm[];
};

export async function getReadFeedBatchAction(
  domainId: string,
  excludeTermIds: string[],
): Promise<ReadFeedBatchResult> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error, terms: [] };

  try {
    const admin = createAdminClient();
    const scope = { domainIds: domainIdsForRead(domainId) };
    const cards = await pickReadTermsForUser(
      admin,
      auth.user.id,
      scope,
      READ_FEED_BATCH_SIZE,
      excludeTermIds,
    );

    if (cards.length === 0) return { caughtUp: true, terms: [] };
    return { terms: cards.map(toReviewTerm) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load more terms. Try again.";
    return { error: message, terms: [] };
  }
}
