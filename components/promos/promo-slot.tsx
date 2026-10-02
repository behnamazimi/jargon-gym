import { getSessionUser } from "@/lib/auth/require-session";
import type { PromoRoute } from "@/lib/promos/promos";
import { getPromoContext, getPromoState } from "@/lib/promos/settings";
import { eligiblePromos, pickPromo } from "@/lib/promos/state";
import { PromoBanner } from "./promo-banner";

/** The banner for this page, in the first HTML. Renders nothing, and asks
 *  for no usage counts, when no promo could show here. */
export async function PromoSlot({ route }: { route: PromoRoute }) {
  const { user } = await getSessionUser();
  if (!user) return null;

  try {
    const now = new Date();
    const state = await getPromoState(user.id);
    const candidates = eligiblePromos(route, state, now);
    if (candidates.length === 0) return null;

    const promo = pickPromo(candidates, await getPromoContext(state, now));
    if (!promo) return null;
    return (
      <PromoBanner
        id={promo.id}
        title={promo.title}
        body={promo.body}
        href={promo.href}
        cta={promo.cta}
      />
    );
  } catch {
    return null;
  }
}
