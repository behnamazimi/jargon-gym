import type { CreditCosts } from "./types";

export function quizCost(questionCount: number, costs: CreditCosts): number {
  return questionCount * costs.quizPerQuestion;
}

export function storyCost(termCount: number, costs: CreditCosts): number {
  return termCount * costs.storyPerTerm;
}

/** The most questions that fit the balance, never above what was asked for. */
export function largestQuizCount(requested: number, remaining: number, costs: CreditCosts): number {
  return Math.min(requested, Math.floor(remaining / costs.quizPerQuestion));
}
