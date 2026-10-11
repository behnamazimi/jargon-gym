import { StoryGenerationError } from "./errors";
import type { StorySegment, StoryTerm } from "./types";

export type StoryGenerationPayload = {
  title: string;
  paragraphs: { segments: StorySegment[] }[];
};

const TERM_MARKER = /\[\[([^[\]|\n]+?)\|\s*(?:#|term\s*)?(\d+)\s*\]\]/gi;
// What's left of a marker that repair couldn't fix: "shards|2]]" with no
// opening bracket, "[2|3]" with no words, or a marker split across lines.
// Brackets in ordinary text (code like "m[i[0]]" or "[[ -f x ]]") have no
// "|number" and are left alone.
const BROKEN_MARKER = /\|\s*(?:#|term\s*)?\d+\s*\]|\[\[?\s*\d+\s*\||\[\uFFFC|\uFFFC\]/i;
const TITLE_PREFIX = /^(?:#+\s*|\*+\s*|title:\s*)+/i;
const CODE_FENCE = /^```[\w-]*$/;

function readParagraph(text: string, termIdByNumber: Map<string, string>): StorySegment[] {
  const segments: StorySegment[] = [];
  let last = 0;
  for (const match of text.matchAll(TERM_MARKER)) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index) });
    const termId = termIdByNumber.get(match[2]!);
    segments.push(termId ? { text: match[1], termId } : { text: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}

function hasBrokenMarker(text: string): boolean {
  return BROKEN_MARKER.test(text.replace(TERM_MARKER, "\uFFFC"));
}

// Some models escape brackets and bars as if writing Markdown: "\[\[shards\|2\]\]".
const ESCAPED_MARKER_CHAR = /\\([[\]|])/g;

// Markers with the wrong number of brackets ("[x|2]", "[[x|2]", "[[[x|2]]]")
// or with the number first ("[[2|x]]"). The words must hold a letter, so a
// stray "[2|3]" isn't read as a term. A marker split across lines isn't
// fixed: there's no telling which words belong to it.
const MISBRACKETED_MARKER = /\[+([^[\]|\n]*\p{L}[^[\]|\n]*?)\|\s*(?:#|term\s*)?(\d+)(\s*\]+)?/giu;
// A "]" later on the line, before any "[", closes something else.
const LATER_CLOSING_BRACKET = /^[^[\n]*\]/;
const NUMBER_FIRST_MARKER = /\[+\s*(?:#|term\s*)?(\d+)\s*\|([^[\]|\n]*\p{L}[^[\]|\n]*?)\]+/giu;

/** Rewrites the malformed markers we can still read as well-formed ones. */
function repairMarkers(text: string): string {
  return text
    .replace(NUMBER_FIRST_MARKER, "[[$2|$1]]")
    .replace(
      MISBRACKETED_MARKER,
      (match, words: string, number: string, closing: string | undefined, offset: number) => {
        // Without its closing brackets, "[Team A|2-1]" or "[Status | 200 OK]"
        // would look like a marker; a "]" further on shows it is ordinary text.
        const rest = text.slice(offset + match.length);
        if (!closing && LATER_CLOSING_BRACKET.test(rest)) return match;
        return `[[${words}|${number}]]`;
      },
    );
}

/** The reply's lines without a code fence wrapped around the whole reply. */
function replyLines(reply: string): string[] {
  const text = reply.replace(/\r\n?/g, "\n").replace(ESCAPED_MARKER_CHAR, "$1");
  const lines = repairMarkers(text).trim().split("\n");
  if (CODE_FENCE.test(lines[0]?.trim() ?? "")) lines.shift();
  if (lines.at(-1)?.trim() === "```") lines.pop();
  return lines;
}

function cleanTitle(line: string): string {
  return line.replace(TITLE_PREFIX, "").replace(/\*+$/, "").replace(TERM_MARKER, "$1").trim();
}

/** Reads the model's plain-text reply: the title on the first line, then the
 *  piece with each term written as [[words|number]]. The text itself is kept
 *  exactly as written; only the markers are read out of it. A marker the
 *  parser can't read, even after repair, fails the reply, so no brackets
 *  reach the reader. */
export function parseStoryText(reply: string, terms: StoryTerm[]): StoryGenerationPayload {
  const termIdByNumber = new Map(terms.map((term, index) => [String(index + 1), term.id]));
  const lines = replyLines(reply);

  // A bare "Title:" line puts the title on the line right after it.
  let titleIndex = lines.findIndex((line) => line.trim());
  if (titleIndex >= 0 && !cleanTitle(lines[titleIndex]!)) titleIndex += 1;
  const titleLine = lines[titleIndex] ?? "";
  const title = cleanTitle(titleLine);

  const texts = lines
    .slice(titleIndex + 1)
    .join("\n")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (texts.some(hasBrokenMarker) || hasBrokenMarker(titleLine)) {
    throw new StoryGenerationError("The story came back with a broken term marker.", "markup");
  }
  const paragraphs = texts.map((text) => ({ segments: readParagraph(text, termIdByNumber) }));
  return { title, paragraphs };
}
