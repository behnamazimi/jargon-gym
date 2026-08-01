import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import type { LlmProvider } from "@/lib/llm/types";
import { normalizeQuizQuestions } from "./normalize";
import { buildQuizGenerationSchema } from "./schema";
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

function buildQuizPrompt(terms: QuizTerm[]): string {
  const mcqCount = Math.ceil(terms.length * 0.6);
  const trueFalseCount = Math.floor(terms.length * 0.4);
  const domainLabel = formatDomainLabel(terms);
  const multipleDomains = new Set(terms.map((term) => term.domainName)).size > 1;

  const termList = terms
    .map((term) => {
      const lines = [`- id: ${term.id}`, `  definition: ${JSON.stringify(term.definition)}`];
      if (term.example?.trim()) {
        lines.push(`  example: ${JSON.stringify(term.example)}`);
      }
      if (multipleDomains) {
        lines.push(`  domain: ${JSON.stringify(term.domainName)}`);
      }
      return lines.join("\n");
    })
    .join("\n");

  return `Generate exactly ${terms.length} vocabulary quiz questions in the domain(s): ${JSON.stringify(domainLabel)} — one per term below, in the same order as the input.

Each term is given as: id and definition (and optionally an example). Use the definition to write the question but do not copy it verbatim — test comprehension via a scenario, use case, or contrast instead of restating it.

Terms:
${termList}

QUESTION TYPE ASSIGNMENT (hard requirement):
- Exactly ${mcqCount} questions must be "multiple_choice"
- Exactly ${trueFalseCount} questions must be "true_false"
- Both counts must be hit exactly — do not default to one type
- Order the questions so same-type questions are not grouped together (no long runs of one type)

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

(The two objects above show the two allowed shapes — every question is one or the other. Do not include fields from the other type.)

Rules:
- Set termId on each question to the input id for that term — copy the UUID exactly, character for character.
- Use each termId exactly once, preserving input order.
- multiple_choice: 3-5 options, short sequential ids ("a", "b", "c", ...). Exactly one correct option — always a single-element correctOptionIds array. Vary which option letter is correct across questions; do not always put the answer in the same position.
- For some multiple_choice questions (roughly half of them), use a definition-match format: write a short definition of the term in the prompt without naming it, then ask which option is the term that matches that definition. In those questions, each option's text must be a term name — the correct option is the target term's name; distractors are other plausible term names from the same domain, not definitions.
- Distractors must be other real jargon, common misconceptions, or near-miss definitions a learner at this level could plausibly confuse with the real term — never random unrelated words.
- correctOptionIds must reference only ids present in that question's options.
- true_false: vary true vs. false roughly evenly across the set — do not make every statement true.
- Prompts must be self-contained: don't assume the reader has the definition in front of them, and don't reference other terms from the list (this can leak answers).
- Tone: write the way a helpful colleague would quiz someone — plain, natural, easy to follow. Avoid robotic or exam-template phrasing (e.g. "Which of the following best describes…", "It is important to note that…", "The aforementioned term"). Keep prompts and option text short, direct, and conversational; use simple words unless the jargon itself requires a technical term.
- If terms.length is 0, return {"questions": []} and skip all other rules.`;
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
}): Promise<QuizQuestion[]> {
  const schema = buildQuizGenerationSchema();
  const prompt = buildQuizPrompt(input.terms);
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
  try {
    return await requestQuizFromModel(input);
  } catch (firstError) {
    try {
      return await requestQuizFromModel(input);
    } catch {
      if (firstError instanceof Error) throw firstError;
      throw new Error("Couldn't generate the quiz. Check your API key and try again.");
    }
  }
}
