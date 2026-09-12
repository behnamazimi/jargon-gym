import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { selectDistractorsFromDomain } from "./distractors";
import { TRUE_FALSE_MAX_SHARE } from "./mix-ratios";

type Client = SupabaseClient<Database>;

export type ExampleJudgmentPick = { text: string; correctAnswer: boolean };

type EligibleTerm = {
  id: string;
  domainId: string;
  example?: string | null;
  antiExample?: string | null;
};

function buildLocalCandidates(term: EligibleTerm): ExampleJudgmentPick[] {
  const example = term.example?.trim();
  const antiExample = term.antiExample?.trim();

  const candidates: ExampleJudgmentPick[] = [];
  if (example) candidates.push({ text: example, correctAnswer: true });
  if (antiExample) candidates.push({ text: antiExample, correctAnswer: false });
  return candidates;
}

/**
 * Finds a real `example` on another domain term to stand in for whichever
 * side (true/false) `term` is missing, so a term that only has `example` (or
 * only `antiExample`) isn't forced to always answer the same way.
 */
async function borrowExampleFromDistractor(client: Client, term: EligibleTerm) {
  const distractors = await selectDistractorsFromDomain(client, term.id, term.domainId, 3);
  for (const distractor of distractors) {
    const text = distractor.example?.trim();
    if (text) return text;
  }
  return null;
}

async function pickJudgmentText(term: EligibleTerm, client: Client) {
  const candidates = buildLocalCandidates(term);

  if (candidates.length < 2) {
    const hasExample = candidates.some((c) => c.correctAnswer);
    const hasAntiExample = candidates.some((c) => !c.correctAnswer);
    if (hasExample !== hasAntiExample) {
      const borrowed = await borrowExampleFromDistractor(client, term);
      if (borrowed) candidates.push({ text: borrowed, correctAnswer: !hasExample });
    }
  }

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Selects up to `maxCount` of `terms` (only from ones with an example or
 * anti_example) and picks one judgment text per selected term — example ->
 * correctAnswer true, anti_example -> correctAnswer false. Shared by every
 * deterministic quiz surface (web's simple generator, the Telegram bot) so
 * the eligibility/cap rule can't drift between them.
 *
 * `maxCount` defaults to TRUE_FALSE_MAX_SHARE of `terms` — the same hard cap
 * quiz surfaces that add plain true/false questions on top of this (AI and
 * simple generation) must pass explicitly, subtracting whatever budget this
 * call already spent, so the two flavors combined never exceed the cap.
 */
export async function assignExampleJudgmentQuestions(
  terms: EligibleTerm[],
  client: Client,
  maxCount: number = Math.floor(terms.length * TRUE_FALSE_MAX_SHARE),
): Promise<Map<string, ExampleJudgmentPick>> {
  const eligible = terms.filter((term) => term.example?.trim() || term.antiExample?.trim());
  const target = Math.min(eligible.length, maxCount);
  const selected = [...eligible].sort(() => Math.random() - 0.5).slice(0, target);

  const picks = await Promise.all(selected.map((term) => pickJudgmentText(term, client)));

  const assignments = new Map<string, ExampleJudgmentPick>();
  selected.forEach((term, index) => {
    const picked = picks[index];
    if (picked) assignments.set(term.id, picked);
  });
  return assignments;
}

/** The question line shown above the quoted scenario, on every surface. */
export function buildExampleJudgmentQuestionLine(termName: string): string {
  return `Does this illustrate "${termName}"?`;
}
