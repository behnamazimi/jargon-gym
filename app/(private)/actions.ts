"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { fetchStreakHistory, type StreakDay } from "@/lib/streak/history";
import { saveUserTimezone } from "@/lib/streak/settings";

/** Silently persists the client-detected IANA timezone, used for streak day boundaries. */
export async function syncTimezoneAction(timezone: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await saveUserTimezone(auth.supabase, auth.user.id, timezone);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save timezone." };
  }
}

/** Last 7 local days of streak activity, for the streak modal. Lazy —
 *  only called when the modal opens, never on page load. */
export async function getStreakHistoryAction(): Promise<{ days?: StreakDay[]; error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    const days = await fetchStreakHistory(auth.supabase);
    return { days };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't load streak history." };
  }
}
