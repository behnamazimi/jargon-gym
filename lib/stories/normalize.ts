import { flattenParagraphs, pushSegment, trimParagraph } from "./paragraphs";
import type { StoryGenerationPayload } from "./markup";
import { STORY_MIN_TERMS, type StorySegment, type StoryTerm } from "./types";

const MIN_WORDS = 40;
const MAX_WORDS = 300;
const MAX_TITLE_LENGTH = 120;

export class StoryGenerationError extends Error {}

function words(text: string): string[] {
  return text
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** True when every word of the term has a word in the text sharing a short
 *  prefix, so "idempotent" matches "idempotency" but not an unrelated word. */
export function surfaceMatchesTerm(surface: string, term: string): boolean {
  const surfaceWords = words(surface);
  const termWords = words(term);
  if (termWords.length === 0 || surfaceWords.length === 0) return false;

  return termWords.every((termWord) => {
    const prefix = termWord.slice(0, Math.min(4, termWord.length));
    return surfaceWords.some((word) => word.startsWith(prefix));
  });
}

function checkedTitle(raw: string): string {
  const title = raw.trim();
  if (!title || title.length > MAX_TITLE_LENGTH) {
    throw new StoryGenerationError("The story came back without a usable title.");
  }
  return title;
}

export function normalizeStory(
  payload: StoryGenerationPayload,
  terms: StoryTerm[],
): { title: string; segments: StorySegment[]; termIds: string[] } {
  const title = checkedTitle(payload.title);
  const termById = new Map(terms.map((term) => [term.id, term]));
  const used = new Set<string>();
  const paragraphs: StorySegment[][] = [];

  for (const rawParagraph of payload.paragraphs) {
    const segments: StorySegment[] = [];
    for (const raw of rawParagraph.segments) {
      if (!raw.text) continue;
      const term = raw.termId ? termById.get(raw.termId) : undefined;
      const core = raw.text.trim();
      if (term && core && surfaceMatchesTerm(core, term.term)) {
        const start = raw.text.indexOf(core);
        if (start > 0) pushSegment(segments, { text: raw.text.slice(0, start) });
        pushSegment(segments, { text: core, termId: term.id });
        const rest = raw.text.slice(start + core.length);
        if (rest) pushSegment(segments, { text: rest });
        used.add(term.id);
      } else {
        pushSegment(segments, { text: raw.text });
      }
    }
    const paragraph = trimParagraph(segments);
    if (paragraph.length > 0) paragraphs.push(paragraph);
  }

  const termIds = terms.map((term) => term.id).filter((id) => used.has(id));
  if (termIds.length < STORY_MIN_TERMS) {
    throw new StoryGenerationError(`Only ${termIds.length} of the terms made it into the story.`);
  }

  const segments = flattenParagraphs(paragraphs);
  const wordCount = words(segments.map((segment) => segment.text).join("")).length;
  if (wordCount < MIN_WORDS || wordCount > MAX_WORDS) {
    throw new StoryGenerationError(`The story came back at ${wordCount} words.`);
  }

  return { title, segments, termIds };
}
