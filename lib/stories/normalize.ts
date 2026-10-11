import { StoryGenerationError } from "./errors";
import { acceptedLength, countLength, type LengthRange } from "./length";
import { flattenParagraphs, pushSegment, trimParagraph } from "./paragraphs";
import type { StoryGenerationPayload } from "./markup";
import type { StorySegment, StoryTerm } from "./types";

const MAX_TITLE_LENGTH = 120;

function checkedTitle(raw: string): string {
  const title = raw.trim();
  if (!title || title.length > MAX_TITLE_LENGTH) {
    throw new StoryGenerationError("The story came back without a usable title.", "title");
  }
  return title;
}

function checkLength(segments: StorySegment[], length: LengthRange) {
  const count = countLength(segments.map((segment) => segment.text).join(""), length.unit);
  const accepted = acceptedLength(length);
  if (count < accepted.min || count > accepted.max) {
    throw new StoryGenerationError(`The story came back at ${count} ${length.unit}.`, "length");
  }
}

/** Turns the parsed reply into the story to save. A term counts when the
 *  model marked it with one of the numbers it was given; the words inside the
 *  marker are the model's choice of form and aren't checked. */
export function normalizeStory(
  payload: StoryGenerationPayload,
  terms: StoryTerm[],
  length: LengthRange,
  minTerms: number,
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
      if (term && core) {
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
  if (termIds.length < minTerms) {
    throw new StoryGenerationError(
      `Only ${termIds.length} of the ${terms.length} terms were marked; this length needs ${minTerms}.`,
      "terms",
    );
  }

  const segments = flattenParagraphs(paragraphs);
  checkLength(segments, length);

  return { title, segments, termIds };
}
