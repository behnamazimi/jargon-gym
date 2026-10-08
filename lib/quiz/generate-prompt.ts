import type { CollectionKind } from "@/lib/terms/kinds";
import { AI_DEFINITION_MAX_CHARS } from "./mix";
import type { AiSlot } from "./plan-ai";
import { truncateAtWord } from "./text/truncate";

const KIND_INTRO: Record<CollectionKind, string> = {
  terms:
    "Field terms: write for someone learning the vocabulary of a profession, using realistic work scenarios.",
  vocabulary:
    "Language words and phrases: write for a beginner learning the language of the term's collection. Put example sentences in that language, keep every other line in English, and use simple words.",
};

const KIND_LABEL: Record<CollectionKind, string> = {
  terms: "field terms",
  vocabulary: "language words",
};

function formatCollectionLabel(slots: AiSlot[]): string {
  return [...new Set(slots.map(({ term }) => term.collectionName))].join(", ");
}

function questionShapes(slots: AiSlot[]): string[] {
  const shapes = new Map<string, string>();
  for (const { template } of slots) {
    const ai = template.ai;
    if (!ai) continue;

    const quote = ai.writesQuote ? '      "quote": "string",\n' : "";
    shapes.set(
      `${ai.interaction}:${ai.writesQuote}`,
      ai.interaction === "choice"
        ? `    {
      "type": "multiple_choice",
      "termId": "string, copied exactly from input",
${quote}      "options": [{ "id": "a", "text": "string" }],
      "correctOptionIds": ["a"]
    }`
        : `    {
      "type": "true_false",
      "termId": "string, copied exactly from input",
${quote}      "correctAnswer": true
    }`,
    );
  }
  return [...shapes.values()];
}

/**
 * The prompt for the questions the model writes. It carries only what these
 * questions need: the guidance of the templates in the quiz, the intro of the
 * kinds in the quiz, and each term's name and (capped) definition.
 */
export function buildQuizPrompt(slots: AiSlot[]): string {
  const multipleCollections = new Set(slots.map(({ term }) => term.collectionName)).size > 1;
  const kinds = [...new Set(slots.map(({ term }) => term.kind))];
  const templates = [...new Map(slots.map(({ template }) => [template.id, template])).values()];

  const termList = slots
    .map(({ term, template }) => {
      const lines = [
        `- id: ${term.id}`,
        `  template: ${template.id}`,
        `  term: ${JSON.stringify(term.term)}`,
        `  definition: ${JSON.stringify(truncateAtWord(term.definition, AI_DEFINITION_MAX_CHARS))}`,
      ];
      if (multipleCollections) lines.push(`  collection: ${JSON.stringify(term.collectionName)}`);
      return lines.join("\n");
    })
    .join("\n");

  const guidance = templates
    .flatMap((template) =>
      kinds.flatMap((kind) => {
        const text = template.ai?.guidance[kind];
        if (!text) return [];
        return `- ${template.id}${kinds.length > 1 ? ` (${KIND_LABEL[kind]})` : ""}: ${text}`;
      }),
    )
    .join("\n");

  return `Write exactly ${slots.length} quiz questions in the collection(s): ${JSON.stringify(formatCollectionLabel(slots))}, one per term below, in the same order. Each term has a "template" that fixes the question shape; write only the fields described for it. The question wording itself is added for you.

${kinds.map((kind) => KIND_INTRO[kind]).join("\n")}

Each term gives an id, a template, the term itself and its definition. Use the definition to understand the term but do not copy it: the question must make the learner apply or recognise the concept, not match reworded text.

Terms:
${termList}

What to write for each template:
${guidance}

Output ONLY valid JSON (no markdown fences, no comments, no commentary before or after), matching this shape exactly:

{
  "questions": [
${questionShapes(slots).join(",\n")}
  ]
}

Rules:
- Set termId on each question to the input id for that term, copied character for character. Use each termId exactly once, in input order.
- Choice questions: 4-5 options with short sequential ids ("a", "b", "c", ...) and exactly one correct option, so correctOptionIds has one id that exists in options. Vary which letter is correct across questions.
- Wrong options must be real, plausible and in the same area as the right answer: something a learner could confuse with it. Never use an option from an unrelated area that can be ruled out without knowing the term.
- The quote must stand on its own: don't assume the reader has the definition, and don't mention other terms from this list.
- Tone: plain, natural and short, as a helpful colleague would quiz someone. No exam phrasing such as "Which of the following best describes…".`;
}
