import type { Domain } from "@/lib/terms/types";

/** Cookie holding the collection last opened in the Library, so a plain
 *  /jargon visit can start loading its terms right away. */
export const LIBRARY_LAST_DOMAIN_COOKIE = "jg_lib_domain";

/** The collection the Library shows: the one asked for, else the one last
 *  viewed, else the first active one, else the first. Shared by the server
 *  page and the sidebar so both agree without talking to each other. */
export function pickLibraryDomainId(
  domains: Pick<Domain, "id" | "isActiveForReview">[],
  options: { requestedDomainId?: string | null; lastDomainId?: string | null },
): string | undefined {
  const has = (id: string | null | undefined): id is string =>
    Boolean(id) && domains.some((domain) => domain.id === id);
  if (has(options.requestedDomainId)) return options.requestedDomainId;
  if (has(options.lastDomainId)) return options.lastDomainId;
  return (domains.find((domain) => domain.isActiveForReview) ?? domains[0])?.id;
}

export function rememberLibraryDomain(domainId: string) {
  document.cookie = `${LIBRARY_LAST_DOMAIN_COOKIE}=${domainId}; path=/; max-age=31536000; samesite=lax`;
}
