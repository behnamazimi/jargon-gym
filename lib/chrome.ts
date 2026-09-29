const STUDY_PREFIXES = ["/jargon", "/admin"] as const;

/** Logged-in study/admin surfaces get app chrome on phone. Everything else is the website. */
export function isStudyPath(pathname: string): boolean {
  return STUDY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isLibraryPath(pathname: string): boolean {
  return pathname === "/jargon";
}

export function isMorePath(pathname: string): boolean {
  return (
    pathname.startsWith("/jargon/browse") ||
    pathname.startsWith("/jargon/import") ||
    pathname.startsWith("/jargon/mastery") ||
    pathname.startsWith("/jargon/settings") ||
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
