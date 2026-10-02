"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { isPromoId, isVisitKey } from "@/lib/promos/promos";
import { dismissPromo, markPromosSeen } from "@/lib/promos/settings";
import { fetchStreakHistory, type StreakDay } from "@/lib/streak/history";
import { saveUserTimezone } from "@/lib/streak/settings";
import { isTourChapterId } from "@/lib/tour/chapters";
import { markTourChapterSeen, skipTour } from "@/lib/tour/settings";

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

export async function markTourChapterSeenAction(chapterId: string): Promise<{ error?: string }> {
  if (!isTourChapterId(chapterId)) return { error: "Unknown tour chapter." };
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await markTourChapterSeen(auth.supabase, chapterId);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save tour progress." };
  }
}

export async function skipTourAction(): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await skipTour(auth.supabase, auth.user.id);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't skip the tour." };
  }
}

export async function markPromoVisitAction(target: string): Promise<{ error?: string }> {
  const key = `visit:${target}`;
  if (!isVisitKey(key)) return { error: "Unknown page." };
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await markPromosSeen(auth.supabase, [key]);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save your visit." };
  }
}

export async function dismissPromoAction(id: string): Promise<{ error?: string }> {
  if (!isPromoId(id)) return { error: "Unknown banner." };
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await dismissPromo(auth.supabase, id);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't dismiss the banner." };
  }
}
