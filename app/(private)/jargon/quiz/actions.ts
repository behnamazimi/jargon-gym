"use server";

import { revalidatePath } from "next/cache";
import { applyQuizAnswer } from "@/lib/jargon/review-outcome";
import { getDecryptedApiKey, getUserSettings } from "@/lib/llm/settings";
import { hasLlmConfigured, LLM_PROVIDER_LABELS } from "@/lib/llm/types";
import { generateQuizQuestions } from "@/lib/quiz/generate";
import { generateSimpleQuiz } from "@/lib/quiz/generate-simple";
import { fetchQuizTermPool, listQuizableCollections } from "@/lib/quiz/terms";
import type { QuizQuestion, QuizQuestionStyle, QuizTerm } from "@/lib/quiz/types";
import type { QuestionType } from "@/lib/trace";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { MAX_STUDY_TERMS } from "@/lib/study";

export async function getQuizSetupData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to take a quiz." };
  }

  const [settings, collections] = await Promise.all([
    getUserSettings(auth.supabase, auth.user.id),
    listQuizableCollections(auth.supabase, auth.user.id),
  ]);

  return {
    llmConfigured: hasLlmConfigured(settings),
    provider: settings?.provider ?? null,
    providerLabel: settings?.provider ? LLM_PROVIDER_LABELS[settings.provider] : null,
    collections,
  };
}

const NOTHING_ELIGIBLE_ERROR = "No terms in this collection yet.";

/** Preview the next quiz batch without generating questions. */
export async function previewQuizQueueAction(input: {
  domainIds: string[] | "all";
  questionCount: number;
}) {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to take a quiz." };
  }

  try {
    const questionCount = Math.floor(input.questionCount);
    if (!Number.isFinite(questionCount) || questionCount < 1) {
      return { error: "Choose at least one question." };
    }

    if (questionCount > MAX_STUDY_TERMS) {
      return { error: `Quizzes are limited to ${MAX_STUDY_TERMS} questions.` };
    }

    const terms = await fetchQuizTermPool(
      auth.supabase,
      auth.user.id,
      input.domainIds,
      questionCount,
    );

    if (terms.length === 0) {
      return { error: NOTHING_ELIGIBLE_ERROR };
    }

    return {
      preview: terms.map((term) => ({
        id: term.id,
        term: term.term,
      })),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load queue preview.";
    return { error: message };
  }
}

export async function generateQuizAction(input: {
  domainIds: string[] | "all";
  questionCount: number;
  questionStyle: QuizQuestionStyle;
}): Promise<
  | { error: string }
  | {
      questions: QuizQuestion[];
      terms: QuizTerm[];
      providerLabel: string;
    }
> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to take a quiz." };
  }

  try {
    const questionCount = Math.floor(input.questionCount);
    if (!Number.isFinite(questionCount) || questionCount < 1) {
      return { error: "Choose at least one question." };
    }

    if (questionCount > MAX_STUDY_TERMS) {
      return { error: `Quizzes are limited to ${MAX_STUDY_TERMS} questions.` };
    }

    const termsPromise = fetchQuizTermPool(
      auth.supabase,
      auth.user.id,
      input.domainIds,
      questionCount,
    );

    let questions: QuizQuestion[];
    let providerLabel: string;
    let terms: QuizTerm[];

    if (input.questionStyle === "simple") {
      terms = await termsPromise;
      if (terms.length === 0) {
        return { error: NOTHING_ELIGIBLE_ERROR };
      }
      questions = await generateSimpleQuiz(terms, auth.supabase);
      providerLabel = "Simple (Definition → Term)";
    } else {
      let credentials;
      [terms, credentials] = await Promise.all([
        termsPromise,
        getDecryptedApiKey(auth.supabase, auth.user.id),
      ]);

      if (terms.length === 0) {
        return { error: NOTHING_ELIGIBLE_ERROR };
      }

      if (!credentials) {
        return { error: "Add a provider and API key in Settings to generate AI quizzes." };
      }

      questions = await generateQuizQuestions({
        provider: credentials.provider,
        apiKey: credentials.apiKey,
        terms,
      });

      providerLabel = LLM_PROVIDER_LABELS[credentials.provider];
    }

    return {
      questions,
      terms,
      providerLabel,
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Couldn't generate the quiz. Check your API key and try again.";
    return { error: message };
  }
}

/** Record outcome for a single answer: updates the Bayesian recognition posterior. */
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

    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't update term progress.";
    return { error: message };
  }
}

/** Finalize quiz. Mutations already happened per answer. */
export async function submitQuizResultsAction(): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to take a quiz." };
  }

  revalidatePath("/jargon");
  return {};
}
