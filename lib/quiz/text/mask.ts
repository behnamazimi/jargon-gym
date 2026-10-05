export const MASK = "_____";

function wholeWordPattern(word: string): RegExp {
  const escaped = word.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "giu");
}

export function containsWholeWord(text: string, word: string): boolean {
  if (!word.trim()) return false;
  return wholeWordPattern(word).test(text);
}

/** Replaces each whole-word, case-insensitive occurrence of `word`. */
export function maskWord(text: string, word: string): string {
  if (!word.trim()) return text;
  return text.replace(wholeWordPattern(word), MASK);
}

/** Masks every given word, so text that names a term can't give it away. */
export function maskWords(text: string, words: string[]): string {
  return words.reduce((masked, word) => maskWord(masked, word), text);
}
