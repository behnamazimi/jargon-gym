import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { TOUR_CHAPTERS, isTourChapterId, type TourChapterId } from "./chapters";
import { NEW_USER_TOUR_STATE, type TourState } from "./state";

type Client = SupabaseClient<Database>;

export async function getTourState(client: Client, userId: string): Promise<TourState> {
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
}

export async function markTourChapterSeen(client: Client, chapterId: TourChapterId) {
  const { error } = await client.rpc("my_mark_tour_chapter_seen", {
    p_chapter: chapterId,
    p_all_chapters: TOUR_CHAPTERS.map((chapter) => chapter.id),
  });
  if (error) throw error;
}

export async function skipTour(client: Client, userId: string) {
  const { error } = await client
    .from("user_settings")
    .upsert(
      { user_id: userId, tour_status: "done", updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}
