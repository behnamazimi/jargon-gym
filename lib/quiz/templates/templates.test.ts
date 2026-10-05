import { describe, expect, it } from "vitest";
import { MASK } from "../text/mask";
import { makeDistractor, makeTerm, rngOf, sourceOf } from "../test-support";
import { buildDefinitionToTerm, definitionToTerm } from "./definition-to-term";
import { doesItFit } from "./does-it-fit";
import { maskedExample } from "./masked-example";
import { booleanLabelsFor, quizFeedbackLine, templateById, templatesFor } from "./registry";
import { termToMeaning } from "./term-to-meaning";
import type { BuildContext } from "./types";

const distractors = [
  makeDistractor({ id: "d1", term: "Velocity", definition: "How fast a team ships." }),
  makeDistractor({ id: "d2", term: "Spike", definition: "A time-boxed experiment." }),
  makeDistractor({ id: "d3", term: "Carryover", definition: "Work pushed to the next sprint." }),
];
const ctx = (list = distractors): BuildContext => ({ source: sourceOf(list), rng: rngOf(0.1) });

const blocker = makeTerm({
  id: "t1",
  term: "Blocker",
  definition: "A blocker stops work that you can't clear alone.",
  example: "I'm blocked by a blocker on the API.",
  antiExample: "A task that is simply large.",
});

describe("definition_to_term", () => {
  it("masks the term in the definition and offers the term plus distractors", async () => {
    const q = await buildDefinitionToTerm(blocker, ctx());
    expect(q.template).toBe("definition_to_term");
    expect(q.quote).toBe(`A ${MASK} stops work that you can't clear alone.`);
    expect(q.options.map((o) => o.id).sort()).toEqual(["d1", "d2", "d3", "t1"]);
    expect(q.correctOptionIds).toEqual(["t1"]);
  });

  it("uses vocabulary wording for a vocabulary term", async () => {
    const q = await buildDefinitionToTerm(makeTerm({ kind: "vocabulary" }), ctx());
    expect(q.prompt).toBe("Which word or phrase means this?");
  });

  it("still builds with no distractors", async () => {
    const q = await buildDefinitionToTerm(blocker, ctx([]));
    expect(q.options).toHaveLength(1);
  });

  it("explains a miss with the right term", async () => {
    const q = await definitionToTerm.build(blocker, ctx());
    expect(quizFeedbackLine(q!, false)).toBe("That definition is for Blocker.");
    expect(quizFeedbackLine(q!, true)).toBeNull();
  });
});

describe("term_to_meaning", () => {
  it("offers masked definitions with ids of their terms", async () => {
    const q = await termToMeaning.build(blocker, ctx());
    expect(q?.interaction).toBe("choice");
    if (q?.interaction !== "choice") return;
    expect(q.prompt).toBe("Which definition fits “Blocker”?");
    expect(q.options.find((o) => o.id === "t1")?.text).toBe(
      `A ${MASK} stops work that you can't clear alone.`,
    );
    expect(q.options.map((o) => o.text).join(" ")).not.toContain("Blocker");
  });

  it("drops a distractor whose meaning matches the right one", async () => {
    const walk = makeTerm({ id: "t", term: "lopen", definition: "to walk", kind: "vocabulary" });
    const q = await termToMeaning.build(
      walk,
      ctx([
        makeDistractor({ id: "d1", term: "wandelen", definition: "to walk" }),
        makeDistractor({ id: "d2", term: "fietsen", definition: "to cycle" }),
        makeDistractor({ id: "d3", term: "rennen", definition: "to run" }),
      ]),
    );
    if (q?.interaction !== "choice") throw new Error("expected a choice question");
    expect(q.options.map((o) => o.id).sort()).toEqual(["d2", "d3", "t"]);
  });

  it("gives up when too few distractors remain", async () => {
    expect(await termToMeaning.build(blocker, ctx(distractors.slice(0, 1)))).toBeNull();
  });
});

describe("masked_example", () => {
  it("is eligible only when the example holds the term as a whole word", () => {
    expect(maskedExample.eligible(blocker)).toBe(true);
    expect(maskedExample.eligible(makeTerm({ term: "lopen", example: "Ik loop elke dag." }))).toBe(
      false,
    );
    expect(maskedExample.eligible(makeTerm({ example: null }))).toBe(false);
  });

  it("blanks every occurrence and keeps the example in the quote", async () => {
    const q = await maskedExample.build(blocker, ctx());
    expect(q?.quote).toBe(`I'm blocked by a ${MASK} on the API.`);
    expect(q?.prompt).toBe("Which term fits the blank?");
  });

  it("gives up when too few distractors exist", async () => {
    expect(await maskedExample.build(blocker, ctx([]))).toBeNull();
  });
});

describe("masked_example on the Dutch seed", () => {
  const dutch = [
    ["lopen", "Ik loop elke dag naar mijn werk.", false],
    ["fietsen", "We fietsen naar het strand.", true],
    ["gezellig", "Wat een gezellige avond!", false],
    ["eigenlijk", "Eigenlijk heb ik geen tijd.", true],
    ["toch", "Je komt toch?", true],
    ["misschien", null, false],
  ] as const;

  it.each(dutch)("%s: cloze only on an exact match", (term, example, eligible) => {
    expect(maskedExample.eligible(makeTerm({ kind: "vocabulary", term, example }))).toBe(eligible);
  });
});

describe("does_it_fit", () => {
  it("is for field terms only and needs an example or anti-example", () => {
    expect(doesItFit.kinds).toEqual(["terms"]);
    expect(doesItFit.eligible(makeTerm())).toBe(false);
    expect(doesItFit.eligible(makeTerm({ antiExample: "x" }))).toBe(true);
  });

  it("asks yes for an example and no for an anti-example", async () => {
    const yes = await doesItFit.build(blocker, { source: sourceOf([]), rng: rngOf(0) });
    expect(yes).toMatchObject({
      interaction: "boolean",
      correctAnswer: true,
      quote: blocker.example,
    });
    const no = await doesItFit.build(blocker, { source: sourceOf([]), rng: rngOf(0.99) });
    expect(no).toMatchObject({ correctAnswer: false, quote: blocker.antiExample });
  });

  it("explains anti-examples and labels the answers Yes and No", async () => {
    const no = await doesItFit.build(blocker, { source: sourceOf([]), rng: rngOf(0.99) });
    expect(quizFeedbackLine(no!, true)).toContain("anti-example");
    expect(booleanLabelsFor(no!)).toEqual({ yes: "Yes", no: "No" });
  });
});

describe("registry", () => {
  it("gives each kind its templates", () => {
    expect(templatesFor("terms", "web").map((t) => t.id)).toEqual([
      "definition_to_term",
      "term_to_meaning",
      "masked_example",
      "does_it_fit",
    ]);
    expect(templatesFor("vocabulary", "web").map((t) => t.id)).not.toContain("does_it_fit");
  });

  it("finds a template by id and knows which ones the model can write", () => {
    expect(templateById("masked_example")?.ai?.interaction).toBe("choice");
    expect(templateById("does_it_fit")?.ai?.interaction).toBe("boolean");
    expect(templateById("typed_cloze")?.ai).toBeUndefined();
    expect(templateById("typed_meaning_to_word")?.ai).toBeUndefined();
  });

  it("uses True/False for a boolean question whose template has no custom labels", () => {
    const question = {
      interaction: "boolean" as const,
      template: "definition_to_term" as const,
      termId: "t",
      prompt: "p",
      correctAnswer: true,
    };
    expect(booleanLabelsFor(question)).toEqual({ yes: "True", no: "False" });
  });
});
