/** An `ilike` pattern that matches this email exactly, ignoring case. The
 *  characters `%` and `_` mean "anything" in a pattern, and `_` is common in
 *  real addresses, so they are escaped. */
export function exactEmailPattern(email: string): string {
  return email.trim().replace(/[\\%_]/g, (char) => `\\${char}`);
}
