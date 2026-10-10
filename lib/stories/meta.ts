import { findFormat, findTone } from "./styles";
import type { Story } from "./types";

/** The labels under a story's title: format, tone, CEFR level. */
export function storyMetaLabels(story: Pick<Story, "format" | "tone" | "cefrLevel">): string[] {
  return [findFormat(story.format)?.label, findTone(story.tone)?.label, story.cefrLevel].filter(
    (label): label is string => Boolean(label),
  );
}
