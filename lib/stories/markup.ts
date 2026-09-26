import type { StorySegment, StoryTerm } from "./types";

export type StoryGenerationPayload = {
  title: string;
  paragraphs: { segments: StorySegment[] }[];
};

const TERM_MARKER = /\[\[([^[\]|]+?)(?:\|\s*(\d+)\s*)?\]\]/g;
const TITLE_PREFIX = /^(?:#+\s*|\*\*|title:\s*)+/i;

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

/** Reads the model's plain-text reply: the title on the first line, then the
 *  piece with each term written as [[words|number]]. The text itself is kept
 *  exactly as written; only the markers are read out of it. */
export function parseStoryText(reply: string, terms: StoryTerm[]): StoryGenerationPayload {
  const termIdByNumber = new Map(terms.map((term, index) => [String(index + 1), term.id]));
  const [firstLine = "", ...rest] = reply.trim().split("\n");
  const title = firstLine
    .replace(TITLE_PREFIX, "")
    .replace(/\*\*$/, "")
    .replace(TERM_MARKER, "$1")
    .trim();
  const paragraphs = rest
    .join("\n")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({ segments: readParagraph(paragraph, termIdByNumber) }));
  return { title, paragraphs };
}
