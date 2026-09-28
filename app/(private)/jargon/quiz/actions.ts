"use server";

import { applyQuizAnswer } from "@/lib/jargon/review-outcome";
import {
  creditsRefusedFailure,
  noAiFailure,
  AI_TEMPORARILY_UNAVAILABLE,
} from "@/lib/ai-credits/messages";
import { runWithCredits } from "@/lib/ai-credits/charge";
import { quizCost } from "@/lib/ai-credits/costs";
import { getAiAccessView, resolveAiAccess } from "@/lib/llm/access";
import { isProviderKeyFault } from "@/lib/llm/errors";
import { LLM_PROVIDER_LABELS, type AiFailureReason } from "@/lib/llm/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateQuizQuestions } from "@/lib/quiz/generate";
import { generateSimpleQuiz } from "@/lib/quiz/generate-simple";
import { fetchQuizTermPool } from "@/lib/quiz/terms";
import { listStudyCollectionState } from "@/lib/study/collections";
import type { QuizQuestion, QuizQuestionStyle, QuizTerm } from "@/lib/quiz/types";
import type { QuestionType } from "@/lib/trace";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { MAX_STUDY_TERMS } from "@/lib/study";

export async function getQuizSetupData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to take a quiz." };
  }

  const [ai, { active: collections, paused }] = await Promise.all([
    getAiAccessView(auth.supabase, auth.user.id),
    listStudyCollectionState(auth.supabase, auth.user.id),
  ]);

  return { ai, collections, paused };
}

const NOTHING_ELIGIBLE_ERROR = "No terms in this collection yet.";

type QuizGenerationResult =
  | { error: string; reason?: AiFailureReason }
  | {
      questions: QuizQuestion[];
      terms: QuizTerm[];
      providerLabel: string;
    };

function validateQuestionCount(rawCount: number): { error: string } | { questionCount: number } {
  const questionCount = Math.floor(rawCount);
  if (!Number.isFinite(questionCount) || questionCount < 1) {
    return { error: "Choose at least one question." };
  }
  if (questionCount > MAX_STUDY_TERMS) {
    return { error: `Quizzes are limited to ${MAX_STUDY_TERMS} questions.` };
  }
  return { questionCount };
}

async function generateSimpleQuizResult(
  auth: Extract<Awaited<ReturnType<typeof requireAuthenticatedClient>>, { supabase: unknown }>,
  termsPromise: Promise<QuizTerm[]>,
): Promise<QuizGenerationResult> {
  const terms = await termsPromise;
  if (terms.length === 0) {
    return { error: NOTHING_ELIGIBLE_ERROR };
  }
  const questions = await generateSimpleQuiz(terms, auth.supabase);
  return { questions, terms, providerLabel: "Simple (Definition → Term)" };
}

async function generateAiQuizResult(
  auth: Extract<Awaited<ReturnType<typeof requireAuthenticatedClient>>, { supabase: unknown }>,
  termsPromise: Promise<QuizTerm[]>,
): Promise<QuizGenerationResult> {
  const [terms, access] = await Promise.all([
    termsPromise,
    resolveAiAccess(auth.supabase, auth.user.id),
  ]);

  if (terms.length === 0) {
    return { error: NOTHING_ELIGIBLE_ERROR };
  }
  if (access.kind === "unavailable") {
    return noAiFailure(access.reason, "generate AI quizzes");
  }

  const providerLabel = LLM_PROVIDER_LABELS[access.provider];
  const generate = () =>
    generateQuizQuestions({
      provider: access.provider,
      apiKey: access.apiKey,
      terms,
      client: auth.supabase,
    });

  if (access.kind === "own") {
    try {
      return { questions: await generate(), terms, providerLabel };
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Couldn't generate the quiz. Check your API key and try again.";
      return { error: message, reason: isProviderKeyFault(err) ? "own-key" : undefined };
    }
  }

  try {
    const outcome = await runWithCredits(
      {
        admin: createAdminClient(),
        userId: auth.user.id,
        feature: "quiz",
        cost: quizCost(terms.length, access.costs),
      },
      generate,
    );
    if (!outcome.charged) return creditsRefusedFailure(outcome, "quiz");
    return { questions: outcome.value, terms, providerLabel };
  } catch (err) {
    console.error("AI quiz with credits failed:", err);
    return {
      error: isProviderKeyFault(err)
        ? AI_TEMPORARILY_UNAVAILABLE
        : "Couldn't generate the quiz. Try again.",
      reason: "unavailable",
    };
  }
}

export async function generateQuizAction(input: {
  domainIds: string[] | "all";
  questionCount: number;
  questionStyle: QuizQuestionStyle;
}): Promise<QuizGenerationResult> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to take a quiz." };
  }

  try {
    const countResult = validateQuestionCount(input.questionCount);
    if ("error" in countResult) return countResult;

    const termsPromise = fetchQuizTermPool(
      auth.supabase,
      auth.user.id,
      input.domainIds,
      countResult.questionCount,
    );

    return input.questionStyle === "simple"
      ? await generateSimpleQuizResult(auth, termsPromise)
      : await generateAiQuizResult(auth, termsPromise);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Couldn't generate the quiz. Check your API key and try again.";
    return { error: message };
  }
}

/** Record outcome for a single answer: updates the Bayesian recognition
 *  posterior. Revalidation of the jargon pages happens separately, once
 *  the client's write queue goes idle — see revalidateStudyPathsAction. */
export async function recordQuizAnswerAction(input: {
  termId: string;
  passed: boolean;
  questionType: QuestionType;
}): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to take a quiz." };
  }

  try {
    await applyQuizAnswer(auth.supabase, auth.user.id, {
      termId: input.termId,
      passed: input.passed,
      questionType: input.questionType,
      mode: "session",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't update term progress.";
    return { error: message };
  }

  return {};
}
