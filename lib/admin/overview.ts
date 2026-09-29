import type { SupabaseClient } from "@supabase/supabase-js";
import { getAiCreditSummaryForAdmin, type AiCreditSummary } from "@/lib/ai-credits/admin";
import { refundsLookHigh } from "@/lib/ai-credits/health";
import { featureHealth } from "@/lib/ai/health";
import { FEATURE_IDS, type FeatureId } from "@/lib/ai/registry";
import {
  readCreditsEnabled,
  readFeaturesOff,
  readSyncNote,
  readWaitlistPending,
} from "./overview-sources";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

type AttentionItem = {
  id: string;
  tone: "error" | "warning" | "info";
  title: string;
  detail: string;
  href: string;
};

const FEATURE_LABELS: Record<FeatureId, string> = {
  quiz: "AI quiz",
  story: "Stories",
  term_evaluation: "Term evaluation",
  narration_term: "Term narration",
  narration_story: "Story narration",
};

const HEALTH_TITLES: Record<FeatureId, string> = {
  quiz: "The app's AI key isn't set up",
  story: "The app's AI key isn't set up",
  term_evaluation: "Term evaluation isn't set up",
  narration_term: "Narration isn't set up",
  narration_story: "Narration isn't set up",
};

const FEATURE_HREFS: Record<FeatureId, string> = {
  quiz: "/admin/ai-credits",
  story: "/admin/ai-credits",
  term_evaluation: "/admin/ai-credits",
  narration_term: "/admin/narration",
  narration_story: "/admin/narration",
};

/** What the Overview is built from. `null` means that source couldn't be read. */
export type OverviewInput = {
  waitlistPending: number | null;
  credits: AiCreditSummary | null;
  creditsEnabled: boolean | null;
  /** Features whose switch is off. */
  featuresOff: FeatureId[] | null;
  /** Set when the narration sync is stalled or the cron job has gone quiet. */
  syncNote: string | null;
};

const TONE_ORDER = { error: 0, warning: 1, info: 2 } as const;

function unreadable(id: string, what: string): AttentionItem {
  return {
    id: `unreadable-${id}`,
    tone: "warning",
    title: `Couldn't load ${what}`,
    detail: "Reload the page. If it keeps happening, check the logs.",
    href: "/admin",
  };
}

function healthItems(): AttentionItem[] {
  // A missing key is judged from the environment, so it is always known.
  const items: AttentionItem[] = [];
  const seenNotes = new Set<string>();
  for (const feature of FEATURE_IDS) {
    const health = featureHealth(feature);
    if (health.ok || seenNotes.has(health.note)) continue;
    seenNotes.add(health.note);
    items.push({
      id: `health-${feature}`,
      tone: "error",
      title: HEALTH_TITLES[feature],
      detail: health.note,
      href: FEATURE_HREFS[feature],
    });
  }
  return items;
}

function creditItems(input: OverviewInput): AttentionItem[] {
  const items: AttentionItem[] = [];
  const { credits } = input;

  if (!credits) items.push(unreadable("credits", "AI credit numbers"));
  else if (refundsLookHigh(credits)) {
    items.push({
      id: "refunds-high",
      tone: "error",
      title: "Many AI requests failed and were refunded",
      detail: "Check that the app's AI key is valid and has quota.",
      href: "/admin/ai-credits",
    });
  }

  if (input.creditsEnabled === null) {
    items.push(unreadable("credits-switch", "the AI credits switch"));
  } else if (!input.creditsEnabled) {
    items.push({
      id: "credits-off",
      tone: "warning",
      title: "AI credits are switched off",
      detail: "Only people with their own key can use AI quizzes and Stories.",
      href: "/admin/ai-credits",
    });
  }

  if (credits && credits.usersExhausted > 0) {
    const count = credits.usersExhausted;
    items.push({
      id: "exhausted",
      tone: "info",
      title: `${count} ${count === 1 ? "person has" : "people have"} run out of AI credits`,
      detail: "Grant more credits if that's not what you want.",
      href: "/admin/ai-credits",
    });
  }
  return items;
}

function featureItems(featuresOff: FeatureId[] | null): AttentionItem[] {
  if (featuresOff === null) return [unreadable("features", "the AI feature switches")];
  return featuresOff.map((feature) => ({
    id: `off-${feature}`,
    tone: "warning",
    title: `${FEATURE_LABELS[feature]} is switched off`,
    detail: "It is off for everyone.",
    href: FEATURE_HREFS[feature],
  }));
}

function waitlistItems(pending: number | null): AttentionItem[] {
  if (pending === null) return [unreadable("waitlist", "the waitlist")];
  if (pending === 0) return [];
  return [
    {
      id: "waitlist",
      tone: "info",
      title: `${pending} ${pending === 1 ? "person is" : "people are"} waiting for an invite`,
      detail: "Approve them to email a signup link.",
      href: "/admin/invites",
    },
  ];
}

/** Everything that needs the admin's attention, most urgent first. */
export function buildAttentionItems(input: OverviewInput): AttentionItem[] {
  const items = [
    ...healthItems(),
    ...creditItems(input),
    ...featureItems(input.featuresOff),
    ...(input.syncNote
      ? [
          {
            id: "sync",
            tone: "warning" as const,
            title: "Narration sync needs attention",
            detail: input.syncNote,
            href: "/admin/narration",
          },
        ]
      : []),
    ...waitlistItems(input.waitlistPending),
  ];
  return items.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}

export type AdminOverview = {
  attention: AttentionItem[];
  stats: {
    totalPeople: number | null;
    usedCredits: number | null;
    creditsSpent: number | null;
    spends24h: number | null;
    waitlistPending: number | null;
  };
};

function settled<T>(label: string, result: PromiseSettledResult<T>): T | null {
  if (result.status === "fulfilled") return result.value;
  console.error(`Couldn't load ${label} for the admin overview:`, result.reason);
  return null;
}

/** One failing source never fails the page: it shows as unknown. */
export async function loadAdminOverview(client: Client): Promise<AdminOverview> {
  const [credits, creditsEnabled, waitlist, featuresOff, syncNote] = await Promise.allSettled([
    getAiCreditSummaryForAdmin(client),
    readCreditsEnabled(client),
    readWaitlistPending(client),
    readFeaturesOff(client),
    readSyncNote(client),
  ]);

  const input: OverviewInput = {
    credits: settled("AI credit numbers", credits),
    creditsEnabled: settled("the credits switch", creditsEnabled),
    waitlistPending: settled("the waitlist", waitlist),
    featuresOff: settled("the feature switches", featuresOff),
    // The sync note is a courtesy: when it can't be read, say nothing about it.
    syncNote: settled("the narration sync", syncNote),
  };

  return {
    attention: buildAttentionItems(input),
    stats: {
      totalPeople: input.credits?.totalUsers ?? null,
      usedCredits: input.credits?.usersWithUse ?? null,
      creditsSpent: input.credits?.creditsSpent ?? null,
      spends24h: input.credits?.spends24h ?? null,
      waitlistPending: input.waitlistPending,
    },
  };
}
