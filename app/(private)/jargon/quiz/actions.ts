"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clearTermKnown, markTermKnown } from "@/lib/jargon/known-state";
import { getDecryptedApiKey, getUserSettings } from "@/lib/llm/settings";
import { LLM_PROVIDER_LABELS } from "@/lib/llm/types";
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
    getUserSettings(auth.supabase, auth.user.id),
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
  questionStyle: QuizQuestionStyle;
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

    // Route to appropriate generator based on questionStyle
    if (input.questionStyle === "simple") {
      // Simple mode: use database terms directly, no AI needed
      questions = await generateSimpleQuiz(terms);
      providerLabel = "Simple (Definition → Term)";
    } else {
      // AI mode: use LLM to generate questions
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

export async function recordQuizAnswerAction(input: {
  termId: string;
  passed: boolean;
}): Promise<{ error?: string }> {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to take a quiz." };
  }

  if (input.passed) {
    return {};
  }

  try {
    const settings = await getUserSettings(auth.supabase, auth.user.id);
    const markUnknownOnFail = settings?.markUnknownOnFail ?? true;

    if (!markUnknownOnFail) {
      return {};
    }

    await clearTermKnown(auth.supabase, auth.user.id, input.termId);
    revalidatePath("/jargon");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't update term progress.";
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
    const settings = await getUserSettings(auth.supabase, auth.user.id);
    const markUnknownOnFail = settings?.markUnknownOnFail ?? true;
    const markKnownOnPass = settings?.markKnownOnPass ?? false;

    const flippedTermIdSet = new Set<string>();

    for (const answer of input.answers) {
      if (!answer.passed) {
        if (markUnknownOnFail) {
          await clearTermKnown(auth.supabase, auth.user.id, answer.termId);
          flippedTermIdSet.add(answer.termId);
        }
        continue;
      }

      if (input.status === "unknown" && markKnownOnPass) {
        await markTermKnown(auth.supabase, answer.termId);
        flippedTermIdSet.add(answer.termId);
      }
    }

    const flippedTermIds = [...flippedTermIdSet];

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
