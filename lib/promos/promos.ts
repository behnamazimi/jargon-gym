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
    title: "Check what stuck",
    body: "Quiz asks you about the terms you've been reviewing, so you can see which ones you really know.",
    href: "/jargon/quiz",
    cta: "Try Quiz",
  },
  {
    id: "stories",
    target: "stories",
    tourChapter: "stories",
    showOn: ["read"],
    priority: 30,
    condition: ({ reads }) => reads >= READS_FOR_STORIES,
    snoozeDays: 14,
    title: "See your terms in a story",
    body: "Stories puts the terms you've been reading into a short piece, so you meet them in context.",
    href: "/jargon/read/stories",
    cta: "Try Stories",
  },
  {
    id: "mastery",
    target: "mastery",
    showOn: ["review", "library"],
    priority: 20,
    condition: ({ reviews }) => reviews >= REVIEWS_FOR_MASTERY,
    snoozeDays: 14,
    title: "See how well you remember",
    body: "Mastery shows where each of your terms stands, from new to solid.",
    href: "/jargon/mastery",
    cta: "Open Mastery",
  },
  {
    id: "browse",
    target: "browse",
    tourChapter: "browse",
    showOn: ["library"],
    priority: 10,
    condition: ({ accountAgeDays }) => accountAgeDays >= DAYS_BEFORE_BROWSE,
    snoozeDays: 14,
    title: "Find more collections",
    body: "Browse collections other people have shared and add the ones you want to practice.",
    href: "/jargon/browse",
    cta: "Browse collections",
  },
  {
    id: "triage",
    target: "triage",
    tourChapter: "triage",
    showOn: ["library"],
    priority: 5,
    condition: ({ reviews, reads }) => reviews + reads > 0,
    snoozeDays: 14,
    title: "Skip what you already know",
    body: "Triage lets you sort terms quickly. The ones you know drop out of practice.",
    href: "/jargon/triage",
    cta: "Open Triage",
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
