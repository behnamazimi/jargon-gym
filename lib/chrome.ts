const STUDY_PREFIXES = ["/app", "/admin"] as const;

/** Logged-in study/admin surfaces get app chrome on phone. Everything else is the website. */
export function isStudyPath(pathname: string): boolean {
  return STUDY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isLibraryPath(pathname: string): boolean {
  return pathname === "/app/library";
}

export function isMorePath(pathname: string): boolean {
  return (
    pathname.startsWith("/app/browse") ||
    pathname.startsWith("/app/import") ||
    pathname.startsWith("/app/capture") ||
    pathname.startsWith("/app/mastery") ||
    pathname.startsWith("/app/settings") ||
    pathname.startsWith("/admin")
  );
}

/** Phone dock destinations: Library, Read, Review, Quiz. Overflow sub-pages hide the dock. */
export function isDockPath(pathname: string): boolean {
  return isStudyPath(pathname) && !isMorePath(pathname);
}

/** Where the phone back arrow on an overflow page (Settings, Mastery, …)
 *  should return to: the dock page the user was last on, with its query so
 *  a scoped collection survives. Overflow and non-study pages are never
 *  back targets. */
export function studyBackTarget(pathname: string, search: string): string | null {
  if (!isDockPath(pathname)) return null;
  return search ? `${pathname}?${search}` : pathname;
}

/** Pages inside a multi-step flow (the paste, apps, more and request pages
 *  under the import chooser, and capture). Their back arrow returns to the page
 *  that opened them, not to the last dock page. */
export function isNestedFlowPath(pathname: string): boolean {
  return pathname.startsWith("/app/import/") || pathname === "/app/capture";
}

/** Where a nested page's back arrow goes when there's no earlier page in this visit. */
export const NESTED_FLOW_PARENT = "/app/import";
