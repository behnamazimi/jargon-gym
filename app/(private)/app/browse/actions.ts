"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import {
  fetchSharedDomainsBrowse,
  type BrowseCollectionFilter,
  type BrowseGroup,
  type BrowsePageResult,
  type BrowseSort,
} from "@/lib/library/browse";

export async function getBrowseSetupData(group: BrowseGroup) {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to browse shared collections." as const };
  }

  const initialPage = await fetchSharedDomainsBrowse(auth.supabase, auth.user.id, { group });

  return { initialPage };
}

export async function searchSharedDomains(input: {
  search: string;
  filter: BrowseCollectionFilter;
  group?: BrowseGroup;
  sort?: BrowseSort;
  offset: number;
}): Promise<{ page?: BrowsePageResult; error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    const page = await fetchSharedDomainsBrowse(auth.supabase, auth.user.id, {
      search: input.search,
      filter: input.filter,
      group: input.group,
      sort: input.sort,
      offset: input.offset,
    });
    return { page };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load collections. Try again.";
    return { error: message };
  }
}
