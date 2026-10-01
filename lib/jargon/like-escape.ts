/** Escapes `\`, `%` and `_` so user text matches literally in an `ilike`
 *  pattern, which would otherwise treat them as wildcards. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
