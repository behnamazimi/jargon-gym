"use server";

import { JargonDataError, loadJargonPageData } from "@/lib/jargon/load-jargon-page-data";
import { getNarrationAccessForUser } from "@/lib/narration/access";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";

export async function getJargonSetupData(selectedDomainId?: string) {
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
