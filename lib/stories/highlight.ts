import type { DomainLanguage } from "@/lib/terms/languages";
import { toParagraphs } from "./paragraphs";
import type { StorySegment } from "./types";

// The narration has no timings, so each sentence gets a share of the clip in
// proportion to its length. These add the beat a voice takes after a sentence
// and after a paragraph, counted in characters. Tune them if the highlight
// drifts against a real clip.
const SENTENCE_PAUSE_WEIGHT = 4;
const PARAGRAPH_PAUSE_WEIGHT = 20;

type Sentence = { index: number; segments: StorySegment[] };

export type StoryTimeline = {
  /** The story's paragraphs, each split into sentences numbered across the piece. */
  paragraphs: Sentence[][];
  /** Where each sentence ends, as a share of the clip from 0 to 1. */
  ends: number[];
  /** Where the spoken title ends; nothing is highlighted before it. */
  titleEnd: number;
  /** When each sentence is actually spoken, without the quiet around it. Until
   *  the clip has been measured this is the whole stretch up to the next one. */
  speech: ShareOfClip[];
};

type ShareOfClip = { start: number; end: number };

/** Sentence starts within the paragraph's text, never inside a term. */
function sentenceCuts(paragraph: StorySegment[], language: DomainLanguage): number[] {
  const text = paragraph.map((segment) => segment.text).join("");
  const termRanges: [number, number][] = [];
  let offset = 0;
  for (const segment of paragraph) {
    if (segment.termId) termRanges.push([offset, offset + segment.text.length]);
    offset += segment.text.length;
  }

  const cuts = new Set<number>();
  for (const { index } of new Intl.Segmenter(language, { granularity: "sentence" }).segment(text)) {
    if (index === 0) continue;
    const term = termRanges.find(([start, end]) => index > start && index < end);
    const cut = term ? term[1] : index;
    if (cut < text.length) cuts.add(cut);
  }
  return [...cuts].sort((a, b) => a - b);
}

function splitAtCuts(paragraph: StorySegment[], cuts: number[]): StorySegment[][] {
  const sentences: StorySegment[][] = [[]];
  let offset = 0;
  let next = 0;
  for (const segment of paragraph) {
    const end = offset + segment.text.length;
    let start = 0;
    while (next < cuts.length && cuts[next]! < end) {
      const at = cuts[next]! - offset;
      if (at > start) {
        sentences[sentences.length - 1]!.push({ ...segment, text: segment.text.slice(start, at) });
      }
      sentences.push([]);
      start = at;
      next += 1;
    }
    if (start < segment.text.length) {
      sentences[sentences.length - 1]!.push({ ...segment, text: segment.text.slice(start) });
    }
    offset = end;
  }
  return sentences.filter((sentence) => sentence.length > 0);
}

function spokenLength(segments: StorySegment[]): number {
  return segments
    .map((segment) => segment.text)
    .join("")
    .trim().length;
}

/** Splits the story into sentences and estimates when each one is spoken. The
 *  narration reads the title first, then the text (see the story subject in
 *  lib/ai/speech/subjects.ts). */
export function buildTimeline(
  title: string,
  segments: StorySegment[],
  language: DomainLanguage,
): StoryTimeline {
  const weights: number[] = [];
  let index = 0;
  const paragraphs = toParagraphs(segments).map((paragraph) => {
    const sentences = splitAtCuts(paragraph, sentenceCuts(paragraph, language)).map(
      (sentenceSegments) => {
        weights.push(spokenLength(sentenceSegments) + SENTENCE_PAUSE_WEIGHT);
        return { index: index++, segments: sentenceSegments };
      },
    );
    if (sentences.length > 0) weights[weights.length - 1]! += PARAGRAPH_PAUSE_WEIGHT;
    return sentences;
  });

  const titleWeight = title.trim().length + PARAGRAPH_PAUSE_WEIGHT;
  const total = titleWeight + weights.reduce((sum, weight) => sum + weight, 0);
  let spoken = titleWeight;
  const ends = weights.map((weight) => (spoken += weight) / total);
  const titleEnd = titleWeight / total;
  return {
    paragraphs,
    ends,
    titleEnd,
    speech: ends.map((end, index) => ({ start: index === 0 ? titleEnd : ends[index - 1]!, end })),
  };
}

/** The sentence being spoken at this share of the clip, or null while the
 *  title is read, before the clip starts, or when there is nothing to show. */
export function sentenceAtFraction(timeline: StoryTimeline, fraction: number): number | null {
  const { ends, titleEnd } = timeline;
  if (!Number.isFinite(fraction) || ends.length === 0 || fraction < titleEnd) return null;

  let low = 0;
  let high = ends.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (ends[middle]! > fraction) high = middle;
    else low = middle + 1;
  }
  return low;
}

/** The stretch of the clip a sentence owns: from where the one before it ends
 *  to where it ends, quiet included. This is what the highlight follows. */
export function sentenceRegion(timeline: StoryTimeline, index: number): ShareOfClip | null {
  const end = timeline.ends[index];
  if (end === undefined) return null;
  return { start: index === 0 ? timeline.titleEnd : timeline.ends[index - 1]!, end };
}

/** Where a sentence is spoken, as shares of the clip from 0 to 1. This is where
 *  playback pauses and replays from. */
export function sentenceBounds(timeline: StoryTimeline, index: number): ShareOfClip | null {
  return timeline.speech[index] ?? null;
}
