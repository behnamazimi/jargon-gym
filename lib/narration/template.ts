import type { NarratedTermFields } from "./types";

function hasText(value: string | null): value is string {
  return Boolean(value?.trim());
}

const PAUSE = "[pause]";

/**
 * Builds the spoken-narration script for a term. Static and deterministic —
 * no LLM involved — so content_hash over the raw fields is a reliable cache
 * key. Field order mirrors components/jargon/term-body.tsx's display order.
 */
export function buildNarrationScript(fields: NarratedTermFields): string {
  const parts = [`${fields.term}. ${fields.definition.trim()}`];

  if (hasText(fields.mental_model)) {
    parts.push(`${PAUSE} Think of it like this: ${fields.mental_model.trim()}`);
  }
  if (hasText(fields.example)) {
    parts.push(`${PAUSE} For example, ${fields.example.trim()}`);
  }
  if (hasText(fields.anti_example)) {
    parts.push(`${PAUSE} A common mistake: ${fields.anti_example.trim()}`);
  }
  if (hasText(fields.discussion)) {
    parts.push(`${PAUSE} In practice, ${fields.discussion.trim()}`);
  }
  if (hasText(fields.controversy)) {
    parts.push(`${PAUSE} One point of debate: ${fields.controversy.trim()}`);
  }

  return parts.join(" ");
}
