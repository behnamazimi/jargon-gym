import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { ReviewStatus } from "./review-session.ts";

export type QuizSetupStep = "status" | "collection" | "count";

export type QuizDomainSelection = "all" | string;

export interface QuizSetupState {
  step: QuizSetupStep;
  status?: ReviewStatus;
  domainId?: QuizDomainSelection;
  /** Message id of the current setup prompt (for editing after text/button replies). */
  promptMessageId?: number;
  startedAt: number;
}

const SETUP_TIMEOUT_MS = 30 * 60 * 1000;

function isQuizSetupState(value: unknown): value is QuizSetupState {
  if (!value || typeof value !== "object") return false;

  const setup = value as QuizSetupState;
  return (
    (setup.step === "status" || setup.step === "collection" || setup.step === "count") &&
    typeof setup.startedAt === "number" &&
    (setup.status === undefined || setup.status === "known" || setup.status === "unknown") &&
    (setup.domainId === undefined || setup.domainId === "all" || typeof setup.domainId === "string")
  );
}

export async function loadQuizSetup(
  supabase: SupabaseClient,
  chatId: number,
): Promise<QuizSetupState | null> {
  const { data, error } = await supabase
    .from("telegram_links")
    .select("quiz_setup")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (error) throw error;
  if (!isQuizSetupState(data?.quiz_setup)) {
    return null;
  }

  if (Date.now() - data.quiz_setup.startedAt > SETUP_TIMEOUT_MS) {
    await clearQuizSetup(supabase, chatId);
    return null;
  }

  return data.quiz_setup;
}

export async function saveQuizSetup(
  supabase: SupabaseClient,
  chatId: number,
  setup: QuizSetupState,
): Promise<void> {
  const { error } = await supabase
    .from("telegram_links")
    .update({
      quiz_setup: setup,
      updated_at: new Date().toISOString(),
    })
    .eq("chat_id", chatId);

  if (error) throw error;
}

export async function clearQuizSetup(supabase: SupabaseClient, chatId: number): Promise<void> {
  const { error } = await supabase
    .from("telegram_links")
    .update({
      quiz_setup: null,
      updated_at: new Date().toISOString(),
    })
    .eq("chat_id", chatId);

  if (error) throw error;
}

export function domainIdsForRpc(domainId: QuizDomainSelection | undefined): string[] | null {
  if (!domainId || domainId === "all") {
    return null;
  }
  return [domainId];
}
