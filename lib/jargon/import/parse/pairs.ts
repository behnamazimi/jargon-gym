const SHORT_LINE = 40;

/** Lines that alternate: a short term line, then a longer definition line. */
export function looksLikePairs(lines: string[]): boolean {
  if (lines.length < 2 || lines.length % 2 !== 0) return false;
  let matching = 0;
  for (let index = 0; index < lines.length; index += 2) {
    const term = lines[index];
    const definition = lines[index + 1];
    if (term.length <= SHORT_LINE && definition.length > term.length) matching++;
  }
  return matching / (lines.length / 2) >= 0.7;
}
