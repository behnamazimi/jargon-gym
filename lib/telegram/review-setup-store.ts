import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { QuizDomainSelection } from "./quiz-session-store";

type Client = SupabaseClient<Database>;

type ReviewSetupStep = "collection" | "count";

export type ReviewSetupState = {
  step: ReviewSetupStep;
  domainId?: QuizDomainSelection;
  promptMessageId?: number;
  startedAt: number;
};

const SETUP_TIMEOUT_MS = 30 * 60 * 1000;

function isReviewSetupState(value: unknown): value is ReviewSetupState {
  if (!value || typeof value !== "object") return false;
  const setup = value as ReviewSetupState;
  return (
    (setup.step === "collection" || setup.step === "count") &&
    typeof setup.startedAt === "number" &&
    (setup.domainId === undefined || setup.domainId === "all" || typeof setup.domainId === "string")
  );
}

export async function loadReviewSetup(
  client: Client,
  chatId: number,
): Promise<ReviewSetupState | null> {
  const { data, error } = await client
    .from("telegram_links")
    .select("review_setup")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (error) throw error;
  if (!isReviewSetupState(data?.review_setup)) return null;

  if (Date.now() - data.review_setup.startedAt > SETUP_TIMEOUT_MS) {
    await clearReviewSetup(client, chatId);
    return null;
  }

  return data.review_setup;
}

export async function saveReviewSetup(
  client: Client,
  chatId: number,
  setup: ReviewSetupState,
): Promise<void> {
  const { error } = await client
    .from("telegram_links")
    .update({
      review_setup: setup as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("chat_id", chatId);

  if (error) throw error;
}

export async function clearReviewSetup(client: Client, chatId: number): Promise<void> {
  const { error } = await client
    .from("telegram_links")
    .update({
      review_setup: null,
      updated_at: new Date().toISOString(),
    })
    .eq("chat_id", chatId);

  if (error) throw error;
}
