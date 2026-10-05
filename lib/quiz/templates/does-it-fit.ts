import { QUIZ_COPY } from "./copy";
import type { QuizTemplate } from "./types";

export const doesItFit: QuizTemplate = {
  id: "does_it_fit",
  kinds: ["terms"],
  channels: ["web", "telegram"],
  booleanLabels: { yes: "Yes", no: "No" },
  eligible: (term) => Boolean(term.example?.trim() || term.antiExample?.trim()),
  async build(term, ctx) {
    const candidates: { text: string; fits: boolean }[] = [];
    const example = term.example?.trim();
    const antiExample = term.antiExample?.trim();
    if (example) candidates.push({ text: example, fits: true });
    if (antiExample) candidates.push({ text: antiExample, fits: false });
    if (candidates.length === 0) return null;

    const chosen = candidates[Math.floor(ctx.rng() * candidates.length)];
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
