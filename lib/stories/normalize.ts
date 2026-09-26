import type { StoryGenerationPayload } from "./schema";
import { STORY_MIN_TERMS, type StorySegment, type StoryTerm } from "./types";

const MIN_WORDS = 80;
const MAX_WORDS = 600;

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

function pushSegment(segments: StorySegment[], segment: StorySegment) {
  const last = segments[segments.length - 1];
  if (!segment.termId && last && !last.termId) {
    last.text += segment.text;
    return;
  }
  segments.push(segment);
}

export function normalizeStory(
  payload: StoryGenerationPayload,
  terms: StoryTerm[],
): { title: string; segments: StorySegment[]; termIds: string[] } {
  const termById = new Map(terms.map((term) => [term.id, term]));
  const segments: StorySegment[] = [];
  const used = new Set<string>();

  for (const raw of payload.segments) {
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

  const termIds = terms.map((term) => term.id).filter((id) => used.has(id));
  if (termIds.length < STORY_MIN_TERMS) {
    throw new StoryGenerationError(`Only ${termIds.length} of the terms made it into the story.`);
  }

  const wordCount = words(segments.map((segment) => segment.text).join("")).length;
  if (wordCount < MIN_WORDS || wordCount > MAX_WORDS) {
    throw new StoryGenerationError(`The story came back at ${wordCount} words.`);
  }

  return { title: payload.title.trim(), segments, termIds };
}
