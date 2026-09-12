import type { QuizGenerationSlot } from "./schema";
import type { QuizTerm } from "./types";

function formatDomainLabel(terms: QuizTerm[]): string {
  const names = [...new Set(terms.map((term) => term.domainName))];
  if (names.length === 1) return names[0];
  return names.join(", ");
}

/**
 * Splits the non-example-judgment remainder into multiple_choice vs
 * true_false, one slot per term. This assignment — not a free-text count in
 * the prompt — is what the model gets held to (buildQuizGenerationSchema
 * turns it into a literal `type` per position), so the mix can't collapse to
 * all-true_false the way it did when the split lived only in prompt text.
 *
 * `trueFalseBudget` is whatever's left of the quiz-wide TRUE_FALSE_MAX_SHARE
 * cap after example-judgment already spent its share — capping here, not
 * with an independent ratio of the remainder, is what keeps the two
 * true/false flavors combined under the cap regardless of how many terms
 * were eligible for example-judgment.
 */
export function buildRemainderPlan(
  remainderTerms: QuizTerm[],
  trueFalseBudget: number,
): QuizGenerationSlot[] {
  const trueFalseCount = Math.max(0, Math.min(trueFalseBudget, remainderTerms.length));
  const trueFalseIds = new Set(
    [...remainderTerms]
      .sort(() => Math.random() - 0.5)
      .slice(0, trueFalseCount)
      .map((term) => term.id),
  );

  return remainderTerms.map((term) => ({
    termId: term.id,
    type: trueFalseIds.has(term.id) ? "true_false" : "multiple_choice",
  }));
}

export function buildQuizPrompt(terms: QuizTerm[], plan: QuizGenerationSlot[]): string {
  const domainLabel = formatDomainLabel(terms);
  const multipleDomains = new Set(terms.map((term) => term.domainName)).size > 1;
  const typeByTermId = new Map(plan.map((slot) => [slot.termId, slot.type]));
  const mcqCount = plan.filter((slot) => slot.type === "multiple_choice").length;
  const trueFalseCount = plan.length - mcqCount;

  const termList = terms
    .map((term) => {
      const lines = [
        `- id: ${term.id}`,
        `  type: ${typeByTermId.get(term.id)}`,
        `  definition: ${JSON.stringify(term.definition)}`,
      ];
      if (multipleDomains) {
        lines.push(`  domain: ${JSON.stringify(term.domainName)}`);
      }
      return lines.join("\n");
    })
    .join("\n");

  return `Generate exactly ${terms.length} vocabulary quiz questions in the domain(s): ${JSON.stringify(domainLabel)} — one per term below, in the same order as the input. Each term already has a required "type" — you must write that exact question shape for that term (${mcqCount} "multiple_choice", ${trueFalseCount} "true_false" — fixed, do not change any term's type).

Each term is given as: id, type, and definition. Use the definition to write the question but do not copy it verbatim — the question must require applying the concept to a scenario, use case, or contrast, not just recognizing a reworded version of the definition. If a learner could match your prompt back to the definition by wording alone, without understanding what the term means, rewrite it.

Terms:
${termList}

Output ONLY valid JSON (no markdown fences, no comments, no commentary before or after), matching this shape exactly:

{
  "questions": [
    {
      "type": "multiple_choice",
      "termId": "string, copied exactly from input",
      "prompt": "string, 1-2 sentences",
      "options": [{ "id": "a", "text": "string" }],
      "correctOptionIds": ["a"]
    },
    {
      "type": "true_false",
      "termId": "string, copied exactly from input",
      "prompt": "string, 1-2 sentences",
      "correctAnswer": true
    }
  ]
}

(The two objects above show the two allowed shapes — every question must match its assigned type from the Terms list above. Do not include fields from the other type.)

Rules:
- Set termId on each question to the input id for that term — copy the UUID exactly, character for character.
- Use each termId exactly once, preserving input order.
- multiple_choice: 4-5 options, short sequential ids ("a", "b", "c", ...). Exactly one correct option — always a single-element correctOptionIds array. Vary which option letter is correct across questions; do not always put the answer in the same position.
- For some multiple_choice questions (roughly half of them), use a definition-match format: write a short definition of the term in the prompt without naming it, then ask which option is the term that matches that definition. In those questions, each option's text must be a term name — the correct option is the target term's name; distractors are other plausible term names from the same domain, not definitions.
- Distractors must be other real jargon, common misconceptions, or near-miss definitions a learner at this level could plausibly confuse with the real term. Each distractor must share a category, mechanism, or use case with the correct answer — never an option from an obviously unrelated concern that a learner could rule out without knowing the target term.
- correctOptionIds must reference only ids present in that question's options.
- true_false: vary true vs. false roughly evenly across the set — do not make every statement true. False statements must alter one specific, plausible-sounding detail (a scope, a trigger condition, a boundary, or a cause/effect direction) while keeping everything else accurate — never swap in an unrelated term or an absurd claim that's obviously false without knowing the term.
- Prompts must be self-contained: don't assume the reader has the definition in front of them, and don't reference other terms from the list (this can leak answers).
- Tone: write the way a helpful colleague would quiz someone — plain, natural, easy to follow. Avoid robotic or exam-template phrasing (e.g. "Which of the following best describes…", "It is important to note that…", "The aforementioned term"). Keep prompts and option text short, direct, and conversational; use simple words unless the jargon itself requires a technical term.`;
}
