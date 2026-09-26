import { StoryGenerationError } from "./normalize";
import type { StorySegment, StoryTerm } from "./types";

export type StoryGenerationPayload = {
  title: string;
  paragraphs: { segments: StorySegment[] }[];
};

const TERM_MARKER = /\[\[([^[\]|\n]+?)(?:\|\s*(?:#|term\s*)?(\d+)\s*)?\]\]/gi;
const TITLE_PREFIX = /^(?:#+\s*|\*+\s*|title:\s*)+/i;
const CODE_FENCE = /^```[\w-]*$/;

function readParagraph(text: string, termIdByNumber: Map<string, string>): StorySegment[] {
  const segments: StorySegment[] = [];
  let last = 0;
  for (const match of text.matchAll(TERM_MARKER)) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index) });
    const termId = match[2] ? termIdByNumber.get(match[2]) : undefined;
    segments.push(termId ? { text: match[1], termId } : { text: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}

/** Brackets left once the readable markers are taken out, like "[[2|x]]"
 *  or the extra brackets of "[[[x|2]]]". */
function hasLeftoverMarker(text: string): boolean {
  return /\[\[|\]\]|\[\uFFFC|\uFFFC\]/.test(text.replace(TERM_MARKER, "\uFFFC"));
}

/** The reply's lines without a code fence wrapped around the whole reply. */
function replyLines(reply: string): string[] {
  const lines = reply.replace(/\r\n?/g, "\n").trim().split("\n");
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
 *  parser can't read fails the reply, so no brackets reach the reader. */
export function parseStoryText(reply: string, terms: StoryTerm[]): StoryGenerationPayload {
  const termIdByNumber = new Map(terms.map((term, index) => [String(index + 1), term.id]));
  const lines = replyLines(reply);

  // A bare "Title:" line puts the title on the next non-empty line.
  let titleIndex = lines.findIndex((line) => cleanTitle(line));
  if (titleIndex < 0) titleIndex = lines.length;
  const title = cleanTitle(lines[titleIndex] ?? "");

  const texts = lines
    .slice(titleIndex + 1)
    .join("\n")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (texts.some(hasLeftoverMarker) || hasLeftoverMarker(lines[titleIndex] ?? "")) {
    throw new StoryGenerationError("The story came back with a broken term marker.");
  }
  const paragraphs = texts.map((text) => ({ segments: readParagraph(text, termIdByNumber) }));
  return { title, paragraphs };
}
