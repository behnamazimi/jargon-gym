import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import type { LlmProvider } from "@/lib/llm/types";
import {
  assignExampleJudgmentQuestions,
  buildExampleJudgmentQuestionLine,
} from "./example-judgment";
import { MCQ_SHARE_OF_REMAINDER } from "./mix-ratios";
import { normalizeQuizQuestions } from "./normalize";
import { buildQuizGenerationSchema, type QuizGenerationSlot } from "./schema";
import type { QuizQuestion, QuizTerm } from "./types";

const MODEL_BY_PROVIDER: Record<LlmProvider, string> = {
  google: "gemini-2.5-flash",
  anthropic: "claude-3-5-haiku-latest",
};

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
 */
function buildRemainderPlan(remainderTerms: QuizTerm[]): QuizGenerationSlot[] {
  const mcqCount = Math.ceil(remainderTerms.length * MCQ_SHARE_OF_REMAINDER);
  const mcqIds = new Set(
    [...remainderTerms]
      .sort(() => Math.random() - 0.5)
      .slice(0, mcqCount)
      .map((term) => term.id),
  );

  return remainderTerms.map((term) => ({
    termId: term.id,
    type: mcqIds.has(term.id) ? "multiple_choice" : "true_false",
  }));
}

function buildQuizPrompt(terms: QuizTerm[], plan: QuizGenerationSlot[]): string {
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

Each term is given as: id, type, and definition. Use the definition to write the question but do not copy it verbatim — test comprehension via a scenario, use case, or contrast instead of restating it.

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
- multiple_choice: 3-5 options, short sequential ids ("a", "b", "c", ...). Exactly one correct option — always a single-element correctOptionIds array. Vary which option letter is correct across questions; do not always put the answer in the same position.
- For some multiple_choice questions (roughly half of them), use a definition-match format: write a short definition of the term in the prompt without naming it, then ask which option is the term that matches that definition. In those questions, each option's text must be a term name — the correct option is the target term's name; distractors are other plausible term names from the same domain, not definitions.
- Distractors must be other real jargon, common misconceptions, or near-miss definitions a learner at this level could plausibly confuse with the real term — never random unrelated words.
- correctOptionIds must reference only ids present in that question's options.
- true_false: vary true vs. false roughly evenly across the set — do not make every statement true.
- Prompts must be self-contained: don't assume the reader has the definition in front of them, and don't reference other terms from the list (this can leak answers).
- Tone: write the way a helpful colleague would quiz someone — plain, natural, easy to follow. Avoid robotic or exam-template phrasing (e.g. "Which of the following best describes…", "It is important to note that…", "The aforementioned term"). Keep prompts and option text short, direct, and conversational; use simple words unless the jargon itself requires a technical term.`;
}

function createModel(provider: LlmProvider, apiKey: string) {
  if (provider === "google") {
    const google = createGoogleGenerativeAI({ apiKey });
    return google(MODEL_BY_PROVIDER.google);
  }

  const anthropic = createAnthropic({ apiKey });
  return anthropic(MODEL_BY_PROVIDER.anthropic);
}

async function requestQuizFromModel(input: {
  provider: LlmProvider;
  apiKey: string;
  terms: QuizTerm[];
  plan: [QuizGenerationSlot, ...QuizGenerationSlot[]];
}): Promise<QuizQuestion[]> {
  const schema = buildQuizGenerationSchema(input.plan);
  const prompt = buildQuizPrompt(input.terms, input.plan);
  const model = createModel(input.provider, input.apiKey);

  const { object } = await generateObject({
    model,
    schema,
    prompt,
    providerOptions:
      input.provider === "google"
        ? {
            google: {
              structuredOutputs: true,
            },
          }
        : undefined,
  });

  return normalizeQuizQuestions(object, input.terms);
}

/** Generate questions for the given terms. Callers must pass the final sampled set only. */
export async function generateQuizQuestions(input: {
  provider: LlmProvider;
  apiKey: string;
  terms: QuizTerm[];
}): Promise<QuizQuestion[]> {
  // Example-judgment questions are built deterministically — same source of
  // truth as the non-AI quiz path (lib/quiz/example-judgment.ts) — so the
  // model is only ever asked to produce the two plain shapes below.
  const exampleJudgment = assignExampleJudgmentQuestions(input.terms);
  const remainderTerms = input.terms.filter((term) => !exampleJudgment.has(term.id));

  const judgmentQuestions = new Map<string, QuizQuestion>();
  for (const term of input.terms) {
    const pick = exampleJudgment.get(term.id);
    if (!pick) continue;
    judgmentQuestions.set(term.id, {
      type: "true_false",
      termId: term.id,
      prompt: `${buildExampleJudgmentQuestionLine(term.term)}\n${pick.text}`,
      correctAnswer: pick.correctAnswer,
    });
  }

  let generatedQuestions = new Map<string, QuizQuestion>();
  if (remainderTerms.length > 0) {
    const plan = buildRemainderPlan(remainderTerms) as [
      QuizGenerationSlot,
      ...QuizGenerationSlot[],
    ];
    const requestInput = { ...input, terms: remainderTerms, plan };

    let generated: QuizQuestion[];
    try {
      generated = await requestQuizFromModel(requestInput);
    } catch (firstError) {
      try {
        generated = await requestQuizFromModel(requestInput);
      } catch {
        if (firstError instanceof Error) throw firstError;
        throw new Error("Couldn't generate the quiz. Check your API key and try again.");
      }
    }
    generatedQuestions = new Map(generated.map((question) => [question.termId, question]));
  }

  const questions = input.terms
    .map((term) => judgmentQuestions.get(term.id) ?? generatedQuestions.get(term.id))
    .filter((question): question is QuizQuestion => Boolean(question));

  if (questions.length === 0) {
    throw new Error("Could not build a valid quiz from the model response.");
  }

  return questions;
}
