"use server";

import { getMyCreditState } from "@/lib/ai-credits/repository";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";

/** The signed-in user's AI credits balance, for the account menus. Null when
 *  credits are off or the lookup fails, so the menus just hide the row. */
export async function getMyAiCreditsAction(): Promise<{ remaining: number } | null> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return null;

  try {
    const state = await getMyCreditState(auth.supabase);
    return state?.enabled ? { remaining: state.remaining } : null;
  } catch (err) {
    console.error("Couldn't load AI credits:", err);
    return null;
  }
}
