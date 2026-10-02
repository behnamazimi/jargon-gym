import { getSessionUser } from "@/lib/auth/require-session";
import type { PromoTarget } from "@/lib/promos/promos";
import { getPromoState } from "@/lib/promos/settings";
import { hasVisitedTarget } from "@/lib/promos/state";
import { VisitTimer } from "./visit-timer";

/** Records that the user has been to this page, unless it's already known. */
export async function PromoVisit({ target }: { target: PromoTarget }) {
  const { user } = await getSessionUser();
  if (!user) return null;

  try {
    const state = await getPromoState(user.id);
    return hasVisitedTarget(state, target) ? null : <VisitTimer target={target} />;
  } catch (err) {
    console.error("Failed to load promo:", err);
    return null;
  }
}
