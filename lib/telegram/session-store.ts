import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { deleteSession } from "./quiz-session-store";
import { clearQuizSetup } from "./quiz-setup-store";
import { deleteReviewSession } from "./review-session-store";
import { clearReviewSetup } from "./review-setup-store";

export * from "./quiz-session-store";
export * from "./quiz-session-actions";
export * from "./quiz-setup-store";
export * from "./review-session-store";
export * from "./review-session-actions";
export * from "./review-setup-store";

type Client = SupabaseClient<Database>;

export async function clearTelegramInteractionState(client: Client, chatId: number): Promise<void> {
  try {
    await clearQuizSetup(client, chatId);
  } catch (error) {
    console.error("Failed to clear quiz setup:", error);
  }
  try {
    await deleteSession(client, chatId);
  } catch (error) {
    console.error("Failed to clear quiz session:", error);
  }
  try {
    await clearReviewSetup(client, chatId);
  } catch (error) {
    console.error("Failed to clear review setup:", error);
  }
  try {
    await deleteReviewSession(client, chatId);
  } catch (error) {
    console.error("Failed to clear review session:", error);
  }
}
