import { generateObject } from "ai";
import { describe, expect, it, vi } from "vitest";
import { generateQuizQuestions } from "./generate";
import type { QuizTerm } from "./types";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

function makeTerm(overrides: Partial<QuizTerm>): QuizTerm {
  return {
    id: "term-default",
    term: "Default Term",
    definition: "A default definition.",
    example: null,
    antiExample: null,
    domainId: "domain-1",
    domainName: "Testing",
    ...overrides,
  };
}

/**
 * Builds a fake model response that matches whatever type each remainder
 * term's prompt line assigned it — mirrors what a well-behaved model would
 * return, without making a real API call.
 */
function fakeGeneratedQuestions(prompt: string) {
  const lines = prompt.split("\n");
  const questions: unknown[] = [];

  for (let i = 0; i < lines.length; i++) {
    const idMatch = /^- id: (.+)$/.exec(lines[i]);
    if (!idMatch) continue;
    const termId = idMatch[1];
    const typeMatch = /^ {2}type: (.+)$/.exec(lines[i + 1] ?? "");
    const type = typeMatch?.[1];

    if (type === "multiple_choice") {
      questions.push({
        type: "multiple_choice",
        termId,
        prompt: `Which one is ${termId}?`,
        options: [
          { id: "a", text: "A" },
          { id: "b", text: "B" },
          { id: "c", text: "C" },
          { id: "d", text: "D" },
        ],
        correctOptionIds: ["a"],
      });
    } else {
      questions.push({
        type: "true_false",
        termId,
        prompt: `Is ${termId} real?`,
        correctAnswer: true,
      });
    }
  }

  return questions;
}

describe("generateQuizQuestions", () => {
  it("keeps example-judgment and model-planned true_false combined at or under 40% of the quiz", async () => {
    // Regression guard: illustration questions alone used to be able to hit
    // 50% of the quiz, with the remainder's true_false share adding more on
    // top. All 10 terms here are eligible for example-judgment, exercising
    // the worst case for the combined cap.
    const terms: QuizTerm[] = Array.from({ length: 10 }, (_, i) =>
      makeTerm({ id: `t${i}`, term: `Term${i}`, example: `Term${i} in action.` }),
    );

    vi.mocked(generateObject).mockImplementation((async ({ prompt }: { prompt: string }) => ({
      object: { questions: fakeGeneratedQuestions(prompt) },
    })) as never);

    const questions = await generateQuizQuestions({
      provider: "anthropic",
      apiKey: "test-key",
      terms,
    });

    const trueFalseCount = questions.filter((q) => q.type === "true_false").length;
    expect(trueFalseCount).toBeLessThanOrEqual(4);
  });
});
