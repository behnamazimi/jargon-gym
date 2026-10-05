import { containsWholeWord, MASK, maskWord } from "../text/mask";
import { DISTRACTOR_COUNT, MIN_DISTRACTORS } from "../mix";
import { QUIZ_COPY } from "./copy";
import { resolveChoice } from "./ai";
import { correctOptionText, pickCandidates, shuffledOptions } from "./choice";
import type { QuizTemplate } from "./types";

export const maskedExample: QuizTemplate = {
  id: "masked_example",
  kinds: ["terms", "vocabulary"],
  channels: ["web", "telegram"],
  ai: {
    interaction: "choice",
    writesQuote: true,
    guidance: {
      terms: `quote: one realistic sentence or scenario that uses the term, with the term replaced by ${MASK}. options: term names; the right one is exactly the term given, the wrong ones are other real terms that could plausibly fill the gap.`,
      vocabulary: `quote: one natural sentence in the term's own language that uses the word or phrase, with it replaced by ${MASK}. options: words or phrases that could fill the gap, but only the one given fits. The right option is exactly the term given.`,
    },
    finish(raw, term) {
      const quote = raw.quote?.trim().replace(/_{3,}/g, MASK);
      const choice = resolveChoice(raw, { correctText: term.term });
      if (!quote || !choice) return null;

      const blanked = maskWord(quote, term.term);
      if (!blanked.includes(MASK)) return null;

      return {
        interaction: "choice",
        template: "masked_example",
        termId: term.id,
        prompt: QUIZ_COPY[term.kind].maskedExample,
        quote: blanked,
        ...choice,
      };
    },
  },
  eligible: (term) => {
    const example = term.example?.trim();
    return Boolean(example) && containsWholeWord(example!, term.term);
  },
  async build(term, ctx) {
    const distractors = (await pickCandidates(term, ctx)).slice(0, DISTRACTOR_COUNT);
    if (distractors.length < MIN_DISTRACTORS) return null;

    return {
      interaction: "choice",
      template: "masked_example",
      termId: term.id,
      prompt: QUIZ_COPY[term.kind].maskedExample,
      quote: maskWord(term.example!.trim(), term.term),
      options: shuffledOptions(
        [{ id: term.id, text: term.term }, ...distractors.map((d) => ({ id: d.id, text: d.term }))],
        ctx,
      ),
      correctOptionIds: [term.id],
    };
  },
  feedback(question, passed) {
    const correct = correctOptionText(question);
    return passed || !correct ? null : `The blank is ${correct}.`;
  },
};
