import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type StreakDay = {
  /** Local calendar date, "YYYY-MM-DD", ascending — last entry is today. */
  date: string;
  isActive: boolean;
  readCount: number;
  reviewedCount: number;
  quizzedCount: number;
};

/** Last 7 local days (today + previous 6) of streak activity for the
 *  calling user, via my_get_streak_history() — session-mode only, only
 *  ever called from the streak modal for the logged-in user. */
export async function fetchStreakHistory(client: Client): Promise<StreakDay[]> {
  const { data, error } = await client.rpc("my_get_streak_history");
  if (error) throw error;

  return (data ?? []).map((row) => ({
    date: row.day,
    isActive: row.is_active,
    readCount: row.read_count,
    reviewedCount: row.reviewed_count,
    quizzedCount: row.quizzed_count,
  }));
}
