/** A pronunciation written at the end of a definition, like "light. /ət ˈlɪxt/". */
const TRAILING_PRONUNCIATION = /\s*\/[^/\n]+\/\s*$/u;

/** The definition without a trailing pronunciation, which would give the term
 *  away in a quiz. Slashes inside the text ("bike / bus / car") are kept. */
export function withoutPronunciation(definition: string): string {
  return definition.replace(TRAILING_PRONUNCIATION, "").trim();
}
