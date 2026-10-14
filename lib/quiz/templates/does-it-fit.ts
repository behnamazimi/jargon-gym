import { namesTerm } from "../text/mask";
import type { QuizTerm } from "../types";
import { QUIZ_COPY } from "./copy";
import type { QuizTemplate } from "./types";

/** Quotes that don't name the term; one that does gives the answer away. */
function candidates(term: QuizTerm): { text: string; fits: boolean }[] {
  return [
    { text: term.example?.trim() ?? "", fits: true },
    { text: term.antiExample?.trim() ?? "", fits: false },
  ].filter(({ text }) => text && !namesTerm(text, term.term, term.language));
}

export const doesItFit: QuizTemplate = {
  id: "does_it_fit",
  kinds: ["terms"],
  channels: ["web", "telegram"],
  booleanLabels: { yes: "Yes", no: "No" },
  ai: {
    interaction: "boolean",
    writesQuote: true,
    guidance: {
      terms:
        "quote: a short realistic scenario. correctAnswer is true when it is a genuine example of the term and false when it is a plausible near-miss that looks like the term but is not. Vary true and false across the quiz.",
      vocabulary: "",
    },
    finish(raw, term) {
      const quote = raw.quote?.trim();
      if (!quote || typeof raw.correctAnswer !== "boolean") return null;

      return {
        interaction: "boolean",
        template: "does_it_fit",
        termId: term.id,
        prompt: QUIZ_COPY[term.kind].doesItFit(term.term),
        quote,
        correctAnswer: raw.correctAnswer,
      };
    },
  },
  eligible: (term) => candidates(term).length > 0,
  async build(term, ctx) {
    const options = candidates(term);
    if (options.length === 0) return null;

    const chosen = options[Math.floor(ctx.rng() * options.length)];
    return {
      interaction: "boolean",
      template: "does_it_fit",
      termId: term.id,
      prompt: QUIZ_COPY[term.kind].doesItFit(term.term),
      quote: chosen.text,
      correctAnswer: chosen.fits,
    };
  },
  feedback(question, passed) {
    if (question.interaction !== "boolean") return null;
    if (!question.correctAnswer) {
      return "This is an anti-example: it shows what the term is not.";
    }
    return passed ? null : "This is a real example of the term.";
  },
};
