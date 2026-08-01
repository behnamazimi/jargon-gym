"use server";

import { revalidatePath } from "next/cache";
import { applyQuizAnswer } from "@/lib/jargon/review-outcome";
import { getDecryptedApiKey, getUserSettings } from "@/lib/llm/settings";
import { hasLlmConfigured, LLM_PROVIDER_LABELS } from "@/lib/llm/types";
import { generateQuizQuestions } from "@/lib/quiz/generate";
import { generateSimpleQuiz } from "@/lib/quiz/generate-simple";
import { MAX_QUIZ_TERMS, fetchQuizTermPool, listQuizableCollections } from "@/lib/quiz/terms";
import type {
  QuizAnswer,
  QuizQuestion,
  QuizQuestionStyle,
  QuizTerm,
  QuizTermStatus,
} from "@/lib/quiz/types";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";

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

export async function generateQuizAction(input: {
  domainIds: string[] | "all";
  status: QuizTermStatus;
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

    if (questionCount > MAX_QUIZ_TERMS) {
      return { error: `Quizzes are limited to ${MAX_QUIZ_TERMS} questions.` };
    }

    const terms = await fetchQuizTermPool(
      auth.supabase,
      auth.user.id,
      input.domainIds,
      input.status,
      questionCount,
    );

    if (terms.length === 0) {
      return { error: "No terms match your selection. Try a different collection or status." };
    }

    let questions: QuizQuestion[];
    let providerLabel: string;

    if (input.questionStyle === "simple") {
      questions = await generateSimpleQuiz(terms, auth.supabase);
      providerLabel = "Simple (Definition → Term)";
    } else {
      const credentials = await getDecryptedApiKey(auth.supabase, auth.user.id);

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

/** Record outcome + apply quiz prefs for a single answer. */
export async function recordQuizAnswerAction(input: {
  termId: string;
  passed: boolean;
  status: QuizTermStatus;
}): Promise<{ error?: string; flipped?: boolean }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to take a quiz." };
  }

  try {
    const { flipped } = await applyQuizAnswer(auth.supabase, auth.user.id, {
      termId: input.termId,
      passed: input.passed,
      status: input.status,
      mode: "session",
    });

    if (flipped) {
      revalidatePath("/jargon");
    }

    return { flipped };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't update term progress.";
    return { error: message };
  }
}

/** Finalize quiz: build flipped-terms summary. Mutations already happened per answer. */
export async function submitQuizResultsAction(input: {
  status: QuizTermStatus;
  answers: QuizAnswer[];
  flippedTermIds: string[];
}): Promise<{ error?: string; flippedTerms?: { id: string; term: string }[] }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to take a quiz." };
  }

  try {
    const flippedTermIds = [...new Set(input.flippedTermIds)];
    let flippedTerms: { id: string; term: string }[] = [];

    if (flippedTermIds.length > 0) {
      const { data, error } = await auth.supabase
        .from("terms")
        .select("id, term")
        .in("id", flippedTermIds);

      if (error) throw error;
      flippedTerms = data;
    }

    revalidatePath("/jargon");

    return { flippedTerms };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't save quiz results. Try again.";
    return { error: message };
  }
}
