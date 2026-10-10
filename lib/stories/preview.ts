import { cleanTitle, TERM_MARKER } from "./markup";

// The end of a marker the model is still writing: "[[wor", "[[word|", "[[word|2]".
const UNFINISHED_MARKER = /\[\[?[^\]]*\]?$/;

/** The story so far as readable text: markers show only their words and a
 *  marker still being written is left out. For showing the reply while it
 *  streams; the saved story comes from parseStoryText. */
export function previewStory(reply: string): { title: string; paragraphs: string[] } {
  const text = reply
    .replace(/\r\n?/g, "\n")
    .replace(TERM_MARKER, "$1")
    .replace(UNFINISHED_MARKER, "")
    .trimStart();
  const [titleLine = "", ...rest] = text.split("\n");
  const paragraphs = rest
    .join("\n")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return { title: cleanTitle(titleLine), paragraphs };
}
