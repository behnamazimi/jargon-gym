"use server";

import { trackServer } from "@/lib/analytics/server";
import { applyQuizAnswer } from "@/lib/terms/review-outcome";
import { createAiTurn } from "@/lib/ai/observability";
import { hasAnalyticsConsent } from "@/lib/consent/server";
import { runAiTurn } from "@/lib/ai/observability-server";
import { busyFailure, creditsRefusedFailure, noAiFailure } from "@/lib/ai-credits/messages";
import { withRunGuard } from "@/lib/ai/run-guard";
import { runMetered } from "@/lib/ai/run-metered";
import { quizCost } from "@/lib/ai-credits/costs";
import { getAiAccessView, resolveAiAccess } from "@/lib/llm/access";
import { LLM_PROVIDER_LABELS, type AiFailureReason } from "@/lib/llm/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { quizFailure } from "@/lib/quiz/failure";
import { AI_QUIZ_MAX_QUESTIONS } from "@/lib/quiz/mix";
import { supabaseDistractorSource } from "@/lib/quiz/distractors-supabase";
import { generateQuizQuestions } from "@/lib/quiz/generate";
import { planAiQuiz } from "@/lib/quiz/plan-ai";
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

function validateQuestionCount(
  rawCount: number,
  style: QuizQuestionStyle,
): { error: string } | { questionCount: number } {
  const questionCount = Math.floor(rawCount);
  if (!Number.isFinite(questionCount) || questionCount < 1) {
    return { error: "Choose at least one question." };
  }
  const limit = style === "ai" ? AI_QUIZ_MAX_QUESTIONS : MAX_STUDY_TERMS;
  if (questionCount > limit) {
    return {
      error: `${style === "ai" ? "AI quizzes" : "Quizzes"} are limited to ${limit} questions.`,
    };
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
  return { questions, terms, providerLabel: "Simple" };
}

async function generateAiQuizResult(
  auth: Extract<Awaited<ReturnType<typeof requireAuthenticatedClient>>, { supabase: unknown }>,
  termsPromise: Promise<QuizTerm[]>,
): Promise<QuizGenerationResult> {
  const [terms, access] = await Promise.all([
    termsPromise,
    resolveAiAccess(auth.supabase, createAdminClient(), auth.user.id, "quiz"),
  ]);

  if (terms.length === 0) {
    return { error: NOTHING_ELIGIBLE_ERROR };
  }
  if (access.kind === "unavailable") {
    trackServer(auth.user.id, "ai_generation_blocked", { feature: "quiz", reason: access.reason });
    return noAiFailure(access.reason, "generate AI quizzes");
  }

  const providerLabel = LLM_PROVIDER_LABELS[access.provider];
  const source = supabaseDistractorSource(auth.supabase);
  // The plan decides which questions the model writes before anything is charged,
  // so only those are paid for.
  const plan = await planAiQuiz(terms, source);
  const observability = createAiTurn(auth.user.id, "quiz_generation", await hasAnalyticsConsent());
  const generate = () =>
    plan.slots.length === 0
      ? generateQuizQuestions({ provider: access.provider, apiKey: access.apiKey, plan, source })
      : runAiTurn(observability, () =>
          generateQuizQuestions({
            provider: access.provider,
            apiKey: access.apiKey,
            plan,
            source,
            observability,
          }),
        );

  if (plan.slots.length === 0) {
    return { questions: await generate(), terms, providerLabel };
  }

  if (access.kind === "own") {
    try {
      const guarded = await withRunGuard(
        { admin: createAdminClient(), userId: auth.user.id, feature: "quiz" },
        generate,
      );
      if (guarded.busy) return busyFailure();
      return { questions: guarded.value, terms, providerLabel };
    } catch (err) {
      console.error("AI quiz with own key failed:", err);
      trackServer(auth.user.id, "ai_generation_failed", { feature: "quiz", using_credits: false });
      return quizFailure(err, false);
    }
  }

  try {
    const outcome = await runMetered(
      {
        admin: createAdminClient(),
        userId: auth.user.id,
        feature: "quiz",
        cost: quizCost(plan.slots.length, access.costs),
      },
      generate,
    );
    if (!outcome.charged) {
      if (outcome.reason !== "busy") {
        trackServer(auth.user.id, "ai_generation_blocked", { feature: "quiz", reason: "credits" });
      }
      return outcome.reason === "busy" ? busyFailure() : creditsRefusedFailure(outcome, "quiz");
    }
    return { questions: outcome.value, terms, providerLabel };
  } catch (err) {
    console.error("AI quiz with credits failed:", err);
    trackServer(auth.user.id, "ai_generation_failed", { feature: "quiz", using_credits: true });
    return quizFailure(err, true);
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
    const countResult = validateQuestionCount(input.questionCount, input.questionStyle);
    if ("error" in countResult) return countResult;

    const termsPromise = fetchQuizTermPool(
      auth.supabase,
      auth.user.id,
      input.domainIds,
      countResult.questionCount,
    );

    const result =
      input.questionStyle === "simple"
        ? await generateSimpleQuizResult(auth, termsPromise)
        : await generateAiQuizResult(auth, termsPromise);

    if (!("error" in result) && input.questionStyle !== "simple") {
      trackServer(auth.user.id, "ai_quiz_generated", { question_count: result.questions.length });
    }

    return result;
  } catch (err) {
    console.error("Quiz generation failed:", err);
    return { error: "Couldn't generate the quiz. Try again." };
  }
}

/** Record outcome for a single answer: updates the Bayesian recognition
 *  posterior. Library and Review read fresh data on their next visit. */
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
    console.error("Quiz answer failed:", err);
    const message = "Couldn't update term progress.";
    return { error: message };
  }

  return {};
}
