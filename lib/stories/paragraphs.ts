import type { StorySegment } from "./types";

const MAX_PARAGRAPH_SENTENCES = 4;
const PARAGRAPH_BREAK = "\n\n";

export function pushSegment(segments: StorySegment[], segment: StorySegment) {
  const last = segments[segments.length - 1];
  if (!segment.termId && last && !last.termId) {
    last.text += segment.text;
    return;
  }
  segments.push(segment);
}

function trimParagraph(paragraph: StorySegment[]): StorySegment[] {
  const segments = paragraph.filter((segment) => segment.text);
  const first = segments[0];
  if (first && !first.termId) first.text = first.text.trimStart();
  const last = segments[segments.length - 1];
  if (last && !last.termId) last.text = last.text.trimEnd();
  return segments.filter((segment) => segment.text);
}

/** Splits a paragraph that runs past MAX_PARAGRAPH_SENTENCES at a sentence
 *  end, so a model that ignores the paragraph rule still yields readable
 *  chunks instead of one wall of text. */
export function splitLongParagraph(segments: StorySegment[]): StorySegment[][] {
  const paragraphs: StorySegment[][] = [[]];
  let sentences = 0;

  for (const segment of segments) {
    if (segment.termId) {
      paragraphs[paragraphs.length - 1]!.push(segment);
      continue;
    }
    const parts = segment.text.split(/(?<=[.!?…])\s+/u);
    parts.forEach((part, index) => {
      const isSentenceEnd = index < parts.length - 1;
      paragraphs[paragraphs.length - 1]!.push({ text: isSentenceEnd ? `${part} ` : part });
      if (!isSentenceEnd) return;
      sentences += 1;
      if (sentences >= MAX_PARAGRAPH_SENTENCES) {
        paragraphs.push([]);
        sentences = 0;
      }
    });
  }

  return paragraphs.map(trimParagraph).filter((paragraph) => paragraph.length > 0);
}

export function flattenParagraphs(paragraphs: StorySegment[][]): StorySegment[] {
  const segments: StorySegment[] = [];
  paragraphs.forEach((paragraph, index) => {
    if (index > 0) pushSegment(segments, { text: PARAGRAPH_BREAK });
    for (const segment of paragraph) pushSegment(segments, { ...segment });
  });
  return segments;
}

/** Paragraphs for display. Also splits pieces saved before paragraphs were
 *  enforced, which can arrive as one long block. */
export function toParagraphs(segments: StorySegment[]): StorySegment[][] {
  const blocks: StorySegment[][] = [[]];
  for (const segment of segments) {
    if (segment.termId) {
      blocks[blocks.length - 1]!.push(segment);
      continue;
    }
    segment.text.split(/\n\s*\n/).forEach((part, index) => {
      if (index > 0) blocks.push([]);
      if (part) blocks[blocks.length - 1]!.push({ text: part });
    });
  }
  return blocks.flatMap(splitLongParagraph);
}
