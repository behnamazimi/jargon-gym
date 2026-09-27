/** Keeps ?domain= in sync with an in-place collection switch, without a
 *  Next.js navigation (which would remount the page). Every Library
 *  collection has a real id — unlike Read there's no "all" sentinel to
 *  special-case. */
export function replaceLibraryDomainInUrl(domainId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("domain", domainId);
  // `null` state lets Next sync useSearchParams (the phone back arrow reads it).
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}
