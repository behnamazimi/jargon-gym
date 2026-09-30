import { findFormat, findTone } from "./styles";
import type { ReadingLevel, Story } from "./types";

const READING_LEVEL_LABELS: Record<ReadingLevel, string> = {
  plain: "Plain",
  professional: "Professional",
  expert: "Expert",
};

/** The labels under a story's title: format, tone, reading level, CEFR level. */
export function storyMetaLabels(
  story: Pick<Story, "format" | "tone" | "readingLevel" | "cefrLevel">,
): string[] {
  return [
    findFormat(story.format)?.label,
    findTone(story.tone)?.label,
    READING_LEVEL_LABELS[story.readingLevel],
    story.cefrLevel,
  ].filter((label): label is string => Boolean(label));
}
