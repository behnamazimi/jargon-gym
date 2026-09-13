"use server";

import { JargonDataError, loadJargonPageData } from "@/lib/jargon/load-jargon-page-data";
import { getNarrationAccessForUser } from "@/lib/narration/access";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import type { JargonPageData } from "@/lib/jargon/types";

/** Explicit so "key in result" narrows cleanly at call sites — TS's
 *  inferred return type for a multi-branch async function doesn't always
 *  discriminate a union the same way an annotated one does. */
export type JargonSetupResult =
  | { error: string }
  | { emptyCollection: true }
  | { error: string; showImportLink: true }
  | { data: JargonPageData; narrationAccess: boolean };

export async function getJargonSetupData(selectedDomainId?: string): Promise<JargonSetupResult> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view your collection." as const };
  }

  try {
    const [data, narrationAccess] = await Promise.all([
      loadJargonPageData(auth.supabase, {
        userId: auth.user.id,
        selectedDomainId,
      }),
      getNarrationAccessForUser(auth.supabase, auth.user.id),
    ]);
    return { data, narrationAccess };
  } catch (err) {
    if (err instanceof JargonDataError && err.message.includes("don't have any collections")) {
      return { emptyCollection: true as const };
    }

    const message =
      err instanceof JargonDataError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Couldn't load your collection. Refresh the page or try again.";

    return { error: message, showImportLink: true as const };
  }
}

/** Client-invoked counterpart to getJargonSetupData, for switching
 *  collections in place without a route navigation. */
export async function getJargonCollectionDataAction(domainId: string): Promise<JargonSetupResult> {
  return getJargonSetupData(domainId);
}
