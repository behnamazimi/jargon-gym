import { quizCost } from "@/lib/ai-credits/costs";
import type { AiAccessView, CreditUse } from "@/lib/llm/types";
import type { QuizQuestionStyle } from "./types";

/** What this quiz would spend, when it runs on AI credits. */
export function quizCreditUse(
  questionStyle: QuizQuestionStyle,
  ai: AiAccessView,
  questionCount: number,
): CreditUse {
  const credits = questionStyle === "ai" && ai.kind === "credits" ? ai : null;
  const cost = credits ? quizCost(questionCount, credits.costs) : 0;
  return { credits, cost, overBalance: credits !== null && cost > credits.remaining };
}
