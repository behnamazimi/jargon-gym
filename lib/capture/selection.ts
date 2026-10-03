import type { Token } from "./tokenize";

/** A run of neighbouring words, by token index. */
export type Selection = { start: number; end: number } | null;

export const MAX_TERM_WORDS = 8;

/** Tapping next to the run extends it, tapping an end shrinks it, and tapping
 *  anywhere else starts a new run. */
export function toggleChip(selection: Selection, index: number): Selection {
  if (!selection) return { start: index, end: index };
  const { start, end } = selection;
  const single = { start: index, end: index };

  if (index === start && index === end) return null;
  if (index === start) return { start: start + 1, end };
  if (index === end) return { start, end: end - 1 };
  if (index > start && index < end) return single;
  if (index === start - 1 && end - index + 1 <= MAX_TERM_WORDS) return { start: index, end };
  if (index === end + 1 && index - start + 1 <= MAX_TERM_WORDS) return { start, end: index };
  return single;
}

/** The selected words as written in the sentence, inner spacing and punctuation kept. */
export function termFromSelection(sentence: string, tokens: Token[], selection: Selection): string {
  if (!selection) return "";
  const first = tokens[selection.start];
  const last = tokens[selection.end];
  if (!first || !last) return "";
  return sentence.slice(first.start, last.end);
}
