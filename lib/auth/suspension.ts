/** Suspending a person bans their auth record. Supabase returns the ban on the user it verifies. */
export function isBanned(user: { banned_until?: string | null }, now = new Date()): boolean {
  return user.banned_until != null && new Date(user.banned_until) > now;
}
