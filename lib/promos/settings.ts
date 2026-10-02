import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { getRequestUserSettingsRow } from "@/lib/streak/settings";
import { isTourDone } from "@/lib/tour/state";
import { getTourState } from "@/lib/tour/settings";
import { isPromoId, isVisitKey, USAGE_CAP, type PromoContext } from "./promos";
import { NEW_USER_PROMO_STATE, accountAgeDays, type PromoState } from "./state";

type Client = SupabaseClient<Database>;

/** Shares the request's one user_settings read with the rest of the chrome. */
export async function getPromoState(userId: string): Promise<PromoState> {
  const [row, tour] = await Promise.all([getRequestUserSettingsRow(userId), getTourState(userId)]);
  if (!row) return NEW_USER_PROMO_STATE;

  const dismissed: Record<string, string> = {};
  if (row.promo_dismissed && typeof row.promo_dismissed === "object") {
    for (const [id, at] of Object.entries(row.promo_dismissed)) {
      if (isPromoId(id) && typeof at === "string") dismissed[id] = at;
    }
  }

  return {
    tourDone: isTourDone(tour),
    tourSeen: tour.seen,
    seen: row.promo_seen.filter(isVisitKey),
    dismissed,
    createdAt: row.created_at,
  };
}

/** Capped counts of the user's reviews and reads. Only called once a promo
 *  is otherwise eligible on the page. */
export async function getPromoContext(state: PromoState, now: Date): Promise<PromoContext> {
  const client = await createClient();
  const { data, error } = await client.rpc("my_promo_usage", { p_cap: USAGE_CAP });
  if (error) throw error;
  const usage = data?.[0];
  return {
    reviews: usage?.reviews ?? 0,
    reads: usage?.reads ?? 0,
    accountAgeDays: accountAgeDays(state, now),
  };
}

export async function markPromosSeen(client: Client, keys: string[]) {
  const { error } = await client.rpc("my_mark_promos_seen", { p_keys: keys });
  if (error) throw error;
}

export async function dismissPromo(client: Client, id: string) {
  const { error } = await client.rpc("my_dismiss_promo", { p_id: id });
  if (error) throw error;
}
