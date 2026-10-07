import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import {
  LibraryDataError,
  loadLibraryPageData,
  NO_COLLECTIONS_MESSAGE,
} from "@/lib/library/load-library-page-data";
import type { FullLibraryPageData } from "@/lib/terms/types";
import { getNarrationAccessForUser } from "@/lib/narration/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const LOAD_FAILED_MESSAGE = "Couldn't load your library. Refresh the page or try again.";

/** Explicit so "key in result" narrows cleanly at call sites. */
export type LibrarySetupResult =
  | { error: string }
  | { emptyCollection: true }
  | { error: string; showImportLink: true }
  | { data: FullLibraryPageData; narrationAccess: boolean };

/** Every term of one collection in full, for Triage. The Library loads a
 *  lighter shape (lib/library/load.ts). */
export async function getLibrarySetupData(selectedDomainId?: string): Promise<LibrarySetupResult> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view your library." as const };
  }

  try {
    const [data, narrationAccess] = await Promise.all([
      loadLibraryPageData(auth.supabase, {
        userId: auth.user.id,
        selectedDomainId,
      }),
      getNarrationAccessForUser(createAdminClient(), auth.user.id),
    ]);
    return { data, narrationAccess };
  } catch (err) {
    if (err instanceof LibraryDataError && err.message === NO_COLLECTIONS_MESSAGE) {
      return { emptyCollection: true as const };
    }
    console.error("Couldn't load the collection:", err);
    return { error: LOAD_FAILED_MESSAGE, showImportLink: true as const };
  }
}
