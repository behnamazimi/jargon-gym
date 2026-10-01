import { classifyTermPaste } from "@/lib/jargon/import/term-paste";
import { tokenize } from "./tokenize";

export const MAX_SENTENCE_CHARS = 500;
const MAX_TERM_WORDS = 3;

export type SharedIntake =
  | { kind: "none" }
  | { kind: "term"; term: string }
  | { kind: "pair"; term: string; definition: string }
  | { kind: "lines"; lines: string[] }
  | { kind: "sentence"; sentence: string };

const URL_PATTERN = /https?:\/\/\S+/g;

function cap(text: string): string {
  if (text.length <= MAX_SENTENCE_CHARS) return text;
  const cut = text.slice(0, MAX_SENTENCE_CHARS);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
}

/** What an Android share holds. The link is stripped (Chrome often puts it in
 *  `text`), and `title` is ignored because it's a page title, not something
 *  the person selected. */
export function parseSharedInput(input: { text?: string | null }): SharedIntake {
  const lines = (input.text ?? "")
    .replace(URL_PATTERN, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (lines.length === 0) return { kind: "none" };

  if (lines.length > 1) {
    const pasted = classifyTermPaste(lines.join("\n"));
    if (pasted.kind === "term-and-definition")
      return { kind: "pair", term: pasted.term, definition: pasted.definition };
    if (pasted.kind === "list") return { kind: "lines", lines: pasted.lines };
  }

  const text = lines.join(" ");
  const words = tokenize(text).length;
  if (words === 0) return { kind: "none" };
  if (words <= MAX_TERM_WORDS && !/[.!?]$/.test(text)) {
    return { kind: "term", term: text.slice(0, 200) };
  }
  return { kind: "sentence", sentence: cap(text) };
}

/** The form's starting values for what was shared. */
export function initialFromShared(shared: SharedIntake) {
  return {
    term: shared.kind === "term" || shared.kind === "pair" ? shared.term : "",
    definition: shared.kind === "pair" ? shared.definition : "",
    sentence: shared.kind === "sentence" ? shared.sentence : null,
    lines: shared.kind === "lines" ? shared.lines : null,
  };
}
