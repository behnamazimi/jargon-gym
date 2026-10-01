export type Token = { text: string; start: number; end: number };

/** Letters, digits and combining marks, with apostrophes and hyphens kept
 *  inside a word ("zzp'er", "SLA's", "follow-up"). Edge punctuation isn't part
 *  of a word. */
const WORD = /[\p{L}\p{N}\p{M}]+(?:['’\-‑][\p{L}\p{N}\p{M}]+)*/gu;

export function tokenize(sentence: string): Token[] {
  return [...sentence.matchAll(WORD)].map((match) => ({
    text: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
}
