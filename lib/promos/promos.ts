import type { TourChapterId } from "@/lib/tour/chapters";

export type PromoRoute = "library" | "review" | "read";

export type PromoTarget = "quiz" | "stories" | "mastery" | "browse" | "triage";

export type PromoContext = {
  reviews: number;
  reads: number;
  accountAgeDays: number;
};

type Promo = {
  id: string;
  target: PromoTarget;
  /** Finishing this tour chapter also counts as having visited the page. */
  tourChapter?: TourChapterId;
  showOn: readonly PromoRoute[];
  /** Higher wins when several promos are eligible on the same page. */
  priority: number;
  condition: (context: PromoContext) => boolean;
  snoozeDays: number;
  title: string;
  body: string;
  href: string;
  cta: string;
};

const REVIEWS_FOR_QUIZ = 10;
const READS_FOR_STORIES = 10;
const REVIEWS_FOR_MASTERY = 10;
const DAYS_BEFORE_BROWSE = 2;

/** The most any condition counts to, so counting stops there. */
export const USAGE_CAP = Math.max(REVIEWS_FOR_QUIZ, READS_FOR_STORIES, REVIEWS_FOR_MASTERY);

export const PROMOS = [
  {
    id: "quiz",
    target: "quiz",
    tourChapter: "quiz",
    showOn: ["review", "read"],
    priority: 40,
    condition: ({ reviews }) => reviews >= REVIEWS_FOR_QUIZ,
    snoozeDays: 14,
    title: "Ready for a quick quiz?",
    body: "You've been busy reviewing. See which terms have really stuck.",
    href: "/jargon/quiz",
    cta: "Take a quiz",
  },
  {
    id: "stories",
    target: "stories",
    tourChapter: "stories",
    showOn: ["read"],
    priority: 30,
    condition: ({ reads }) => reads >= READS_FOR_STORIES,
    snoozeDays: 14,
    title: "Meet your terms in a story",
    body: "A short read built from the terms you've been learning.",
    href: "/jargon/read/stories",
    cta: "Read a story",
  },
  {
    id: "mastery",
    target: "mastery",
    showOn: ["review", "library"],
    priority: 20,
    condition: ({ reviews }) => reviews >= REVIEWS_FOR_MASTERY,
    snoozeDays: 14,
    title: "How well do you remember?",
    body: "See where each term stands, from new to solid.",
    href: "/jargon/mastery",
    cta: "See my mastery",
  },
  {
    id: "browse",
    target: "browse",
    tourChapter: "browse",
    showOn: ["library"],
    priority: 10,
    condition: ({ accountAgeDays }) => accountAgeDays >= DAYS_BEFORE_BROWSE,
    snoozeDays: 14,
    title: "Looking for more to learn?",
    body: "Browse collections others have shared and add your favorites.",
    href: "/jargon/browse",
    cta: "Browse",
  },
  {
    id: "triage",
    target: "triage",
    tourChapter: "triage",
    showOn: ["library"],
    priority: 5,
    condition: ({ reviews, reads }) => reviews + reads > 0,
    snoozeDays: 14,
    title: "Already know some terms?",
    body: "Triage them in a minute and skip what you know.",
    href: "/jargon/triage",
    cta: "Try Triage",
  },
] as const satisfies readonly Promo[];

export type PromoId = (typeof PROMOS)[number]["id"];

export function isPromoId(value: string): value is PromoId {
  return PROMOS.some((promo) => promo.id === value);
}

export function visitKey(target: PromoTarget): string {
  return `visit:${target}`;
}

export function isVisitKey(value: string): boolean {
  return PROMOS.some((promo) => visitKey(promo.target) === value);
}
