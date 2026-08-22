"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import {
  fetchSharedDomainsBrowse,
  type BrowseCollectionFilter,
  type BrowsePageResult,
} from "@/lib/jargon/browse";

export async function searchSharedDomains(input: {
  search: string;
  filter: BrowseCollectionFilter;
  offset: number;
}): Promise<{ page?: BrowsePageResult; error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    const page = await fetchSharedDomainsBrowse(auth.supabase, auth.user.id, {
      search: input.search,
      filter: input.filter,
      offset: input.offset,
    });
    return { page };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load collections. Try again.";
    return { error: message };
  }
}
