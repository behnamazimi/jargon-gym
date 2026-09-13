import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { selectDistractorsFromDomain } from "./distractors";

type Client = SupabaseClient<Database>;

type EligibleTerm = {
  id: string;
  term: string;
  domainId: string;
  example?: string | null;
  antiExample?: string | null;
};

export const NONE_OF_THESE_OPTION_ID = "none";
export const NONE_OF_THESE_OPTION_TEXT = "None of these";

/** The question line shown above the quoted scenario, on every surface. Not
 *  parameterized by term name — the term is the thing being guessed. */
export const ILLUSTRATION_QUESTION_LINE = "What does this illustrate?";

export type IllustrationPick = {
  scenarioText: string;
  /** "None of these" (if present) is always last, not shuffled in. */
  options: { id: string; text: string }[];
  /** A real term UUID, or NONE_OF_THESE_OPTION_ID. */
  correctOptionId: string;
};

type ScenarioCandidate = { text: string; isExample: boolean };

function buildCandidates(term: EligibleTerm): ScenarioCandidate[] {
  const example = term.example?.trim();
  const antiExample = term.antiExample?.trim();

  const candidates: ScenarioCandidate[] = [];
  if (example) candidates.push({ text: example, isExample: true });
  if (antiExample) candidates.push({ text: antiExample, isExample: false });
  return candidates;
}

async function buildExamplePick(
  term: EligibleTerm,
  scenarioText: string,
  client: Client,
): Promise<IllustrationPick> {
  const distractors = await selectDistractorsFromDomain(client, term.id, term.domainId, 3);
  const options = [
    { id: term.id, text: term.term },
    ...distractors.map((d) => ({ id: d.id, text: d.term })),
  ].sort(() => Math.random() - 0.5);

  return { scenarioText, options, correctOptionId: term.id };
}

/** An anti_example doesn't illustrate any term, so the correct answer is
 *  "None of these" — but the term itself is deliberately kept as one of the
 *  wrong options (selectDistractorsFromDomain would otherwise exclude it),
 *  as a trap testing whether the user is fooled into picking it. */
async function buildAntiExamplePick(
  term: EligibleTerm,
  scenarioText: string,
  client: Client,
): Promise<IllustrationPick> {
  const distractors = await selectDistractorsFromDomain(client, term.id, term.domainId, 2);
  const termOptions = [
    { id: term.id, text: term.term },
    ...distractors.map((d) => ({ id: d.id, text: d.term })),
  ].sort(() => Math.random() - 0.5);

  return {
    scenarioText,
    options: [...termOptions, { id: NONE_OF_THESE_OPTION_ID, text: NONE_OF_THESE_OPTION_TEXT }],
    correctOptionId: NONE_OF_THESE_OPTION_ID,
  };
}

async function buildPick(term: EligibleTerm, client: Client): Promise<IllustrationPick | null> {
  const candidates = buildCandidates(term);
  if (candidates.length === 0) return null;

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return chosen.isExample
    ? buildExamplePick(term, chosen.text, client)
    : buildAntiExamplePick(term, chosen.text, client);
}

/**
 * Builds a "What does this illustrate?" multiple-choice pick for every term
 * with its own example or anti_example text — no cap, no cross-term
 * borrowing. Terms with neither are left out of the returned map entirely;
 * callers fall back to another question type for those. Shared by every
 * Simple-mode-equivalent quiz surface (web's simple generator, the Telegram
 * bot) so the eligibility rule can't drift between them.
 */
export async function buildIllustrationQuestions(
  terms: EligibleTerm[],
  client: Client,
): Promise<Map<string, IllustrationPick>> {
  const eligible = terms.filter((term) => term.example?.trim() || term.antiExample?.trim());
  const picks = await Promise.all(eligible.map((term) => buildPick(term, client)));

  const assignments = new Map<string, IllustrationPick>();
  eligible.forEach((term, index) => {
    const picked = picks[index];
    if (picked) assignments.set(term.id, picked);
  });
  return assignments;
}
