import { getSessionUser } from "@/lib/auth/require-session";
import { getTourState } from "@/lib/tour/settings";
import { isTourDone } from "@/lib/tour/state";
import { TourLoader } from "./tour-loader";

export async function TourIsland() {
  const { user } = await getSessionUser();
  if (!user) return null;

  try {
    const state = await getTourState(user.id);
    if (isTourDone(state)) return null;
    return <TourLoader initialState={state} />;
  } catch {
    // The tour is optional; a failed read just means no tips this load.
    return null;
  }
}
