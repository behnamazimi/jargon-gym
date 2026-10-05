import type { QuizChoiceQuestion } from "../types";
import type { AiRaw } from "./types";

const MIN_OPTIONS = 4;
const MAX_OPTIONS = 5;

function resolveCorrectOptionId(
  options: { id: string; text: string }[],
  correctOptionIds: string[] | undefined,
): string | null {
  if (!correctOptionIds?.length) return null;

  const exact = correctOptionIds.find((id) => options.some((option) => option.id === id));
  if (exact) return exact;

  const byLowercase = new Map(options.map((option) => [option.id.toLowerCase(), option.id]));
  for (const id of correctOptionIds) {
    const match = byLowercase.get(id.toLowerCase());
    if (match) return match;
  }
  return null;
}

/**
 * The choice part of a model-written question: usable options, one right answer,
 * no repeated texts. `correctText` replaces the right option's text with the
 * term's real name; `mapText` cleans every option (such as masking the term).
 */
export function resolveChoice(
  raw: AiRaw,
  options: { correctText?: string; mapText?: (text: string) => string } = {},
): Pick<QuizChoiceQuestion, "options" | "correctOptionIds"> | null {
  const usable = (raw.options ?? []).filter((option) => option.id && option.text.trim());
  if (usable.length < MIN_OPTIONS) return null;

  const correctId = resolveCorrectOptionId(usable, raw.correctOptionIds);
  if (!correctId) return null;

  const cleaned = usable.map((option) => ({
    id: option.id,
    text:
      option.id === correctId && options.correctText !== undefined
        ? options.correctText
        : (options.mapText?.(option.text.trim()) ?? option.text.trim()),
  }));
  const wrong = cleaned.filter((option) => option.id !== correctId);
  const correct = cleaned.find((option) => option.id === correctId)!;
  const seen = new Set([correct.text.toLowerCase()]);
  const kept = wrong.filter((option) => {
    const key = option.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const chosen = [correct, ...kept].slice(0, MAX_OPTIONS);
  if (chosen.length < MIN_OPTIONS) return null;

  const inOriginalOrder = cleaned.filter((option) => chosen.includes(option));
  return { options: inOriginalOrder, correctOptionIds: [correctId] };
}
