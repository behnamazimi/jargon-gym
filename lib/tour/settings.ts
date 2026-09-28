import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { isTourChapterId } from "./chapters";
import { NEW_USER_TOUR_STATE, type TourState } from "./state";

type Client = SupabaseClient<Database>;

export const getTourState = cache(async function getTourState(
  client: Client,
  userId: string,
): Promise<TourState> {
  const { data, error } = await client
    .from("user_settings")
    .select("tour_status, tour_seen")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return NEW_USER_TOUR_STATE;
  return {
    status: data.tour_status === "done" ? "done" : "pending",
    seen: data.tour_seen.filter(isTourChapterId),
  };
});

export async function saveTourState(
  client: Client,
  userId: string,
  state: TourState,
): Promise<void> {
  const { error } = await client.from("user_settings").upsert(
    {
      user_id: userId,
      tour_status: state.status,
      tour_seen: [...state.seen],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}
