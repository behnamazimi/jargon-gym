import { describe, expect, it } from "vitest";
import { buildQuizGenerationSchema, type QuizGenerationSlot } from "./schema";

describe("buildQuizGenerationSchema", () => {
  it("rejects a response that answers every slot as true_false when the plan calls for a mix", () => {
    // Regression guard: this is the exact failure mode reported in production —
    // the model returned true_false for every question despite the mix
    // requiring multiple_choice too. The type must now be locked in per slot
    // so this shape fails validation instead of silently being accepted.
    const plan: [QuizGenerationSlot, ...QuizGenerationSlot[]] = [
      { termId: "t1", type: "multiple_choice" },
      { termId: "t2", type: "true_false" },
    ];
    const schema = buildQuizGenerationSchema(plan);

    const allTrueFalse = {
      questions: [
        { type: "true_false", termId: "t1", prompt: "Is t1 real?", correctAnswer: true },
        { type: "true_false", termId: "t2", prompt: "Is t2 real?", correctAnswer: true },
      ],
    };

    expect(schema.safeParse(allTrueFalse).success).toBe(false);
  });

  it("accepts a response matching the plan's exact type per slot", () => {
    const plan: [QuizGenerationSlot, ...QuizGenerationSlot[]] = [
      { termId: "t1", type: "multiple_choice" },
      { termId: "t2", type: "true_false" },
    ];
    const schema = buildQuizGenerationSchema(plan);

    const matching = {
      questions: [
        {
          type: "multiple_choice",
          termId: "t1",
          prompt: "Which one is t1?",
          options: [
            { id: "a", text: "T1" },
            { id: "b", text: "Distractor A" },
            { id: "c", text: "Distractor B" },
          ],
          correctOptionIds: ["a"],
        },
        { type: "true_false", termId: "t2", prompt: "Is t2 real?", correctAnswer: true },
      ],
    };

    expect(schema.safeParse(matching).success).toBe(true);
  });

  it("rejects a termId outside the plan", () => {
    const plan: [QuizGenerationSlot, ...QuizGenerationSlot[]] = [
      { termId: "t1", type: "true_false" },
    ];
    const schema = buildQuizGenerationSchema(plan);

    const result = schema.safeParse({
      questions: [{ type: "true_false", termId: "unknown-id", prompt: "?", correctAnswer: true }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a response with the wrong number of questions", () => {
    const plan: [QuizGenerationSlot, ...QuizGenerationSlot[]] = [
      { termId: "t1", type: "true_false" },
      { termId: "t2", type: "true_false" },
    ];
    const schema = buildQuizGenerationSchema(plan);

    const tooFew = {
      questions: [{ type: "true_false", termId: "t1", prompt: "?", correctAnswer: true }],
    };

    expect(schema.safeParse(tooFew).success).toBe(false);
  });
});
