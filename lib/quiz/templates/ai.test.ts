import { describe, expect, it } from "vitest";
import { MASK } from "../text/mask";
import { makeTerm } from "../test-support";
import { definitionToTerm } from "./definition-to-term";
import { doesItFit } from "./does-it-fit";
import { maskedExample } from "./masked-example";
import { termToMeaning } from "./term-to-meaning";

const options = [
  { id: "a", text: "Wrong guess" },
  { id: "b", text: "Blocker thing" },
  { id: "c", text: "Other" },
  { id: "d", text: "Another" },
];
const term = makeTerm({ id: "t", term: "Blocker" });
const finish = (t: typeof definitionToTerm, raw: object) => t.ai!.finish(raw, term);

describe("definition_to_term (model-written)", () => {
  const raw = { quote: "Something that stops the work.", options, correctOptionIds: ["a"] };

  it("replaces the right option's text with the real term and uses the shared wording", () => {
    const q = finish(definitionToTerm, raw);
    expect(q).toMatchObject({
      interaction: "choice",
      template: "definition_to_term",
      prompt: "Which term matches this definition?",
      quote: "Something that stops the work.",
      correctOptionIds: ["a"],
    });
    expect(q?.interaction === "choice" && q.options.find((o) => o.id === "a")?.text).toBe(
      "Blocker",
    );
  });

  it("masks the term if the model named it in the quote", () => {
    const q = finish(definitionToTerm, { ...raw, quote: "A Blocker stops work." });
    expect(q?.quote).toBe(`A ${MASK} stops work.`);
  });

  it("rejects too few options, a missing quote or an unknown correct id", () => {
    expect(finish(definitionToTerm, { ...raw, options: options.slice(0, 3) })).toBeNull();
    expect(finish(definitionToTerm, { ...raw, quote: " " })).toBeNull();
    expect(finish(definitionToTerm, { ...raw, correctOptionIds: ["z"] })).toBeNull();
  });

  it("accepts a correct id that differs only in case, and drops repeated options", () => {
    const dup = [...options.slice(0, 3), { id: "d", text: "other" }, { id: "e", text: "Fresh" }];
    const q = finish(definitionToTerm, { ...raw, options: dup, correctOptionIds: ["A"] });
    expect(q?.interaction === "choice" && q.options.map((o) => o.id)).toEqual(["a", "b", "c", "e"]);
    expect(q?.interaction === "choice" && q.correctOptionIds).toEqual(["a"]);
  });
});

describe("term_to_meaning (model-written)", () => {
  it("masks the term in every option and names the term in the prompt", () => {
    const q = finish(termToMeaning, {
      options: options.map((o) => ({ ...o, text: `${o.text} of Blocker` })),
      correctOptionIds: ["a"],
    });
    expect(q?.prompt).toBe("Which definition fits “Blocker”?");
    expect(q?.interaction === "choice" && q.options.every((o) => !o.text.includes("Blocker"))).toBe(
      true,
    );
    expect(q?.quote).toBeUndefined();
  });
});

describe("masked_example (model-written)", () => {
  const raw = { quote: "We hit a Blocker today.", options, correctOptionIds: ["a"] };

  it("blanks the term and keeps the blank the model wrote", () => {
    expect(finish(maskedExample, raw)?.quote).toBe(`We hit a ${MASK} today.`);
    expect(finish(maskedExample, { ...raw, quote: "We hit a ___ today." })?.quote).toBe(
      `We hit a ${MASK} today.`,
    );
  });

  it("rejects a quote with no blank", () => {
    expect(finish(maskedExample, { ...raw, quote: "We hit a wall today." })).toBeNull();
  });
});

describe("does_it_fit (model-written)", () => {
  it("builds a yes/no question from a quote and a boolean", () => {
    const q = doesItFit.ai!.finish({ quote: "A stuck ticket.", correctAnswer: false }, term);
    expect(q).toMatchObject({
      interaction: "boolean",
      prompt: "Is this an example of “Blocker”?",
      quote: "A stuck ticket.",
      correctAnswer: false,
    });
  });

  it("rejects a missing boolean or quote", () => {
    expect(doesItFit.ai!.finish({ quote: "x" }, term)).toBeNull();
    expect(doesItFit.ai!.finish({ correctAnswer: true }, term)).toBeNull();
  });
});
