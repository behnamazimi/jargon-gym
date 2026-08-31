import { EXAMPLE_JUDGMENT_MAX_SHARE } from "./mix-ratios";

export type ExampleJudgmentPick = { text: string; correctAnswer: boolean };

type EligibleTerm = { id: string; example?: string | null; antiExample?: string | null };

function pickJudgmentText(term: EligibleTerm): ExampleJudgmentPick | null {
  const example = term.example?.trim();
  const antiExample = term.antiExample?.trim();

  const candidates: ExampleJudgmentPick[] = [];
  if (example) candidates.push({ text: example, correctAnswer: true });
  if (antiExample) candidates.push({ text: antiExample, correctAnswer: false });

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Selects up to EXAMPLE_JUDGMENT_MAX_SHARE of `terms` (only from ones with an
 * example or anti_example) and picks one judgment text per selected term —
 * example -> correctAnswer true, anti_example -> correctAnswer false. Shared
 * by every deterministic quiz surface (web's simple generator, the Telegram
 * bot) so the eligibility/cap rule can't drift between them.
 */
export function assignExampleJudgmentQuestions(
  terms: EligibleTerm[],
): Map<string, ExampleJudgmentPick> {
  const eligible = terms.filter((term) => term.example?.trim() || term.antiExample?.trim());
  const target = Math.min(eligible.length, Math.round(terms.length * EXAMPLE_JUDGMENT_MAX_SHARE));
  const selected = [...eligible].sort(() => Math.random() - 0.5).slice(0, target);

  const assignments = new Map<string, ExampleJudgmentPick>();
  for (const term of selected) {
    const picked = pickJudgmentText(term);
    if (picked) assignments.set(term.id, picked);
  }
  return assignments;
}

/** The question line shown above the quoted scenario, on every surface. */
export function buildExampleJudgmentQuestionLine(termName: string): string {
  return `Does this illustrate "${termName}"?`;
}
