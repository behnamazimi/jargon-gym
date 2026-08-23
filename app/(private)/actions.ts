"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
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
