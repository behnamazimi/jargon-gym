/** The database doesn't have the AI feature tables or functions yet, as when
 *  the app deploys a moment before its migration. Any other error is real. */
export function isSchemaMissing(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  // 42P01 / 42883: Postgres undefined table / function. PGRST205 / PGRST202: PostgREST's schema cache.
  return ["42P01", "42883", "PGRST205", "PGRST202"].includes(String(error.code));
}
