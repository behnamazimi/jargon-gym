import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  buildQuizGenerationObjectSchema,
  buildQuizGenerationSchema,
  toQuizGenerationPayload,
  type QuizGenerationSlot,
} from "./schema";

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

describe("buildQuizGenerationObjectSchema", () => {
  // Regression guard: Gemini's response_schema rejects the positional tuple
  // buildQuizGenerationSchema produces ("Unknown name \"items\" ... Proto
  // field is not repeating, cannot start list"). This object-keyed variant
  // must enforce the same per-slot type without ever using a tuple/array of
  // differently-shaped items.
  it("has no tuple-style array field anywhere in its JSON Schema", () => {
    const plan: [QuizGenerationSlot, ...QuizGenerationSlot[]] = [
      { termId: "t1", type: "multiple_choice" },
      { termId: "t2", type: "true_false" },
    ];
    const schema = buildQuizGenerationObjectSchema(plan);
    const jsonSchema = z.toJSONSchema(schema);

    expect(JSON.stringify(jsonSchema)).not.toContain('"items":[');
  });

  it("rejects a response that answers every slot as true_false when the plan calls for a mix", () => {
    const plan: [QuizGenerationSlot, ...QuizGenerationSlot[]] = [
      { termId: "t1", type: "multiple_choice" },
      { termId: "t2", type: "true_false" },
    ];
    const schema = buildQuizGenerationObjectSchema(plan);

    const allTrueFalse = {
      questions: {
        question_0: {
          type: "true_false",
          termId: "t1",
          prompt: "Is t1 real?",
          correctAnswer: true,
        },
        question_1: {
          type: "true_false",
          termId: "t2",
          prompt: "Is t2 real?",
          correctAnswer: true,
        },
      },
    };

    expect(schema.safeParse(allTrueFalse).success).toBe(false);
  });

  it("accepts a response matching the plan's exact type per slot and converts back to the ordered array shape", () => {
    const plan: [QuizGenerationSlot, ...QuizGenerationSlot[]] = [
      { termId: "t1", type: "multiple_choice" },
      { termId: "t2", type: "true_false" },
    ];
    const schema = buildQuizGenerationObjectSchema(plan);

    const matching = {
      questions: {
        question_0: {
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
        question_1: {
          type: "true_false",
          termId: "t2",
          prompt: "Is t2 real?",
          correctAnswer: true,
        },
      },
    };

    const parsed = schema.parse(matching);
    const payload = toQuizGenerationPayload(parsed, plan);

    expect(payload.questions.map((question) => question.termId)).toEqual(["t1", "t2"]);
    expect(payload.questions[0].type).toBe("multiple_choice");
    expect(payload.questions[1].type).toBe("true_false");
  });
});
