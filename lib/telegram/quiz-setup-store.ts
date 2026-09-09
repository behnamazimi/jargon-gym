import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { QuizDomainSelection } from "./quiz-session-store";

type Client = SupabaseClient<Database>;

type QuizSetupStep = "collection" | "count";

export type QuizSetupState = {
  step: QuizSetupStep;
  domainId?: QuizDomainSelection;
  promptMessageId?: number;
  startedAt: number;
};

const SETUP_TIMEOUT_MS = 30 * 60 * 1000;

function isQuizSetupState(value: unknown): value is QuizSetupState {
  if (!value || typeof value !== "object") return false;
  const setup = value as QuizSetupState;
  return (
    (setup.step === "collection" || setup.step === "count") &&
    typeof setup.startedAt === "number" &&
    (setup.domainId === undefined || setup.domainId === "all" || typeof setup.domainId === "string")
  );
}

export async function loadQuizSetup(
  client: Client,
  chatId: number,
): Promise<QuizSetupState | null> {
  const { data, error } = await client
    .from("telegram_links")
    .select("quiz_setup")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (error) throw error;
  if (!isQuizSetupState(data?.quiz_setup)) return null;

  if (Date.now() - data.quiz_setup.startedAt > SETUP_TIMEOUT_MS) {
    await clearQuizSetup(client, chatId);
    return null;
  }

  return data.quiz_setup;
}

export async function saveQuizSetup(
  client: Client,
  chatId: number,
  setup: QuizSetupState,
): Promise<void> {
  const { error } = await client
    .from("telegram_links")
    .update({
      quiz_setup: setup as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("chat_id", chatId);

  if (error) throw error;
}

export async function clearQuizSetup(client: Client, chatId: number): Promise<void> {
  const { error } = await client
    .from("telegram_links")
    .update({
      quiz_setup: null,
      updated_at: new Date().toISOString(),
    })
    .eq("chat_id", chatId);

  if (error) throw error;
}
