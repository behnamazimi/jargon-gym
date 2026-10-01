export type TermPaste =
  | { kind: "single" }
  | { kind: "term-and-definition"; term: string; definition: string }
  | { kind: "list"; lines: string[] };

const PROSE_WORDS = 4;

function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

/** What a paste into the Term box means. One line is just a term. Two lines
 *  with prose on the second are a term and its definition. Anything longer is
 *  taken for a list. */
export function classifyTermPaste(text: string): TermPaste {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return { kind: "single" };
  if (lines.length === 2 && wordCount(lines[0]) <= 6 && wordCount(lines[1]) >= PROSE_WORDS) {
    return { kind: "term-and-definition", term: lines[0], definition: lines[1] };
  }
  return { kind: "list", lines };
}
