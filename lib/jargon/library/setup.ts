import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import {
  JargonDataError,
  loadJargonPageData,
  NO_COLLECTIONS_MESSAGE,
} from "@/lib/jargon/load-jargon-page-data";
import type { JargonPageData } from "@/lib/jargon/types";
import { getNarrationAccessForUser } from "@/lib/narration/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const LOAD_FAILED_MESSAGE = "Couldn't load your collection. Refresh the page or try again.";

/** Explicit so "key in result" narrows cleanly at call sites. */
export type JargonSetupResult =
  | { error: string }
  | { emptyCollection: true }
  | { error: string; showImportLink: true }
  | { data: JargonPageData; narrationAccess: boolean };

/** Every term of one collection in full, for Triage. The Library loads a
 *  lighter shape (lib/jargon/library/load.ts). */
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
      getNarrationAccessForUser(createAdminClient(), auth.user.id),
    ]);
    return { data, narrationAccess };
  } catch (err) {
    if (err instanceof JargonDataError && err.message === NO_COLLECTIONS_MESSAGE) {
      return { emptyCollection: true as const };
    }
    console.error("Couldn't load the collection:", err);
    return { error: LOAD_FAILED_MESSAGE, showImportLink: true as const };
  }
}
