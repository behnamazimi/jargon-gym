"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clearTermKnown, markTermKnown } from "@/lib/jargon/known-state";
import { getDecryptedApiKey, getUserLlmSettings } from "@/lib/llm/settings";
import { LLM_PROVIDER_LABELS } from "@/lib/llm/types";
import { generateQuizQuestions } from "@/lib/quiz/generate";
import { MAX_QUIZ_TERMS, fetchQuizTermPool, listQuizableCollections } from "@/lib/quiz/terms";
import type { QuizAnswer, QuizQuestion, QuizTerm, QuizTermStatus } from "@/lib/quiz/types";

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Log in to continue." as const };
  }

  return { supabase, user };
}

export async function getQuizSetupData() {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to take a quiz." };
  }

  const [settings, collections] = await Promise.all([
    getUserLlmSettings(auth.supabase, auth.user.id),
    listQuizableCollections(auth.supabase, auth.user.id),
  ]);

  return {
    llmConfigured: settings !== null,
    provider: settings?.provider ?? null,
    providerLabel: settings ? LLM_PROVIDER_LABELS[settings.provider] : null,
    collections,
  };
}

export async function generateQuizAction(input: {
  domainIds: string[] | "all";
  status: QuizTermStatus;
  questionCount: number;
}): Promise<
  | { error: string }
  | {
      questions: QuizQuestion[];
      terms: QuizTerm[];
      providerLabel: string;
    }
> {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to take a quiz." };
  }

  try {
    const credentials = await getDecryptedApiKey(auth.supabase, auth.user.id);

    if (!credentials) {
      return { error: "Add a provider and API key in Settings to generate quizzes." };
    }

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

    // `terms` is already shuffled and capped to `questionCount` — only this array reaches the LLM.
    const questions = await generateQuizQuestions({
      provider: credentials.provider,
      apiKey: credentials.apiKey,
      terms,
    });

    return {
      questions,
      terms,
      providerLabel: LLM_PROVIDER_LABELS[credentials.provider],
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Couldn't generate the quiz. Check your API key and try again.";
    return { error: message };
  }
}

export async function submitQuizResultsAction(input: {
  status: QuizTermStatus;
  answers: QuizAnswer[];
}): Promise<{ error?: string; flippedTerms?: { id: string; term: string }[] }> {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to take a quiz." };
  }

  try {
    const settings = await getUserLlmSettings(auth.supabase, auth.user.id);
    const markUnknownOnFail = settings?.markUnknownOnFail ?? true;
    const markKnownOnPass = settings?.markKnownOnPass ?? false;

    const flippedTermIds: string[] = [];

    for (const answer of input.answers) {
      if (input.status === "known" && !answer.passed && markUnknownOnFail) {
        await clearTermKnown(auth.supabase, auth.user.id, answer.termId);
        flippedTermIds.push(answer.termId);
      }

      if (input.status === "unknown" && answer.passed && markKnownOnPass) {
        await markTermKnown(auth.supabase, answer.termId);
        flippedTermIds.push(answer.termId);
      }
    }

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
