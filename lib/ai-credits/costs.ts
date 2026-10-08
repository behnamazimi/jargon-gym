import type { CreditCosts, CreditPrice } from "./types";

/** What `units` of an action cost. Mirrors `ai_credit_price` in the database,
 *  which is what actually charges. Rounded first so 2 + 0.5 × 6 is never 5.0000001. */
function creditPrice(price: CreditPrice, units: number): number {
  const exact = price.baseCredits + (price.creditsPerUnit * units) / price.unitSize;
  return Math.max(1, Math.ceil(Number(exact.toFixed(6))));
}

export function quizCost(questionCount: number, costs: CreditCosts): number {
  return creditPrice(costs.quiz, questionCount);
}

export function storyCost(termCount: number, costs: CreditCosts): number {
  return creditPrice(costs.story, termCount);
}

export function narrationCost(characterCount: number, costs: CreditCosts): number {
  return creditPrice(costs.narration_story, characterCount);
}

/** The most questions that fit the balance, never above what was asked for. */
export function largestQuizCount(requested: number, remaining: number, costs: CreditCosts): number {
  for (let count = requested; count > 0; count--) {
    if (quizCost(count, costs) <= remaining) return count;
  }
  return 0;
}
