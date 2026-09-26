import type { StorySegment } from "./types";

const PARAGRAPH_BREAK = "\n\n";

export function pushSegment(segments: StorySegment[], segment: StorySegment) {
  const last = segments[segments.length - 1];
  if (!segment.termId && last && !last.termId) {
    last.text += segment.text;
    return;
  }
  segments.push(segment);
}

/** Drops whitespace at a paragraph's edges so the blank-line join is clean. */
export function trimParagraph(paragraph: StorySegment[]): StorySegment[] {
  const segments = paragraph.filter((segment) => segment.text);
  const first = segments[0];
  if (first && !first.termId) first.text = first.text.trimStart();
  const last = segments[segments.length - 1];
  if (last && !last.termId) last.text = last.text.trimEnd();
  return segments.filter((segment) => segment.text);
}

export function flattenParagraphs(paragraphs: StorySegment[][]): StorySegment[] {
  const segments: StorySegment[] = [];
  paragraphs.forEach((paragraph, index) => {
    if (index > 0) pushSegment(segments, { text: PARAGRAPH_BREAK });
    for (const segment of paragraph) pushSegment(segments, { ...segment });
  });
  return segments;
}

/** The paragraphs the model wrote, recovered from the stored blank-line breaks. */
export function toParagraphs(segments: StorySegment[]): StorySegment[][] {
  const paragraphs: StorySegment[][] = [[]];
  for (const segment of segments) {
    if (segment.termId) {
      paragraphs[paragraphs.length - 1]!.push(segment);
      continue;
    }
    segment.text.split(/\n\s*\n/).forEach((part, index) => {
      if (index > 0) paragraphs.push([]);
      if (part) paragraphs[paragraphs.length - 1]!.push({ text: part });
    });
  }
  return paragraphs.filter((paragraph) => paragraph.some((segment) => segment.text.trim()));
}
