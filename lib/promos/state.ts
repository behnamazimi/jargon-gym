import { PROMOS, visitKey, type PromoRoute, type PromoTarget } from "./promos";

export type PromoState = {
  tourDone: boolean;
  tourSeen: readonly string[];
  seen: readonly string[];
  /** Promo id to the ISO time it was dismissed. */
  dismissed: Readonly<Record<string, string>>;
  createdAt: string | null;
};

type Promo = (typeof PROMOS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

/** No settings row yet means the tour hasn't finished. */
export const NEW_USER_PROMO_STATE: PromoState = {
  tourDone: false,
  tourSeen: [],
  seen: [],
  dismissed: {},
  createdAt: null,
};

function hasVisited(state: PromoState, promo: Promo): boolean {
  if (state.seen.includes(visitKey(promo.target))) return true;
  return "tourChapter" in promo && state.tourSeen.includes(promo.tourChapter);
}

export function hasVisitedTarget(state: PromoState, target: PromoTarget): boolean {
  const promo = PROMOS.find((candidate) => candidate.target === target);
  return promo ? hasVisited(state, promo) : true;
}

function isSnoozed(state: PromoState, promo: Promo, now: Date): boolean {
  const dismissedAt = Date.parse(state.dismissed[promo.id] ?? "");
  if (Number.isNaN(dismissedAt)) return false;
  return now.getTime() - dismissedAt < promo.snoozeDays * DAY_MS;
}

/** Promos that could show here before any usage is known. Empty means the
 *  page needs no usage query at all. */
export function eligiblePromos(route: PromoRoute, state: PromoState, now: Date): Promo[] {
  if (!state.tourDone) return [];
  return PROMOS.filter(
    (promo) =>
      (promo.showOn as readonly PromoRoute[]).includes(route) &&
      !hasVisited(state, promo) &&
      !isSnoozed(state, promo, now),
  );
}

export function accountAgeDays(state: PromoState, now: Date): number {
  const created = Date.parse(state.createdAt ?? "");
  if (Number.isNaN(created)) return 0;
  return Math.floor((now.getTime() - created) / DAY_MS);
}

export function pickPromo(
  candidates: readonly Promo[],
  context: Parameters<Promo["condition"]>[0],
): Promo | null {
  const passing = candidates.filter((promo) => promo.condition(context));
  return passing.reduce<Promo | null>(
    (best, promo) => (!best || promo.priority > best.priority ? promo : best),
    null,
  );
}
