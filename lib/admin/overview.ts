import type { SupabaseClient } from "@supabase/supabase-js";
import { getAiCreditSummaryForAdmin, type AiCreditSummary } from "@/lib/ai-credits/admin";
import { refundsLookHigh } from "@/lib/ai-credits/health";
import { featureHealth } from "@/lib/ai/health";
import { AI_FEATURE_META } from "./ai-features";
import { recentAudit, type AuditRow } from "./audit-query";
import { FEATURE_IDS, type FeatureId } from "@/lib/ai/registry";
import {
  readCreditsEnabled,
  readFeaturesOff,
  readNewIssues,
  readReportedCollections,
  readRequestsAttention,
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

const HEALTH_TITLES: Record<FeatureId, string> = {
  quiz: "The app's AI key isn't set up",
  story: "The app's AI key isn't set up",
  narration_term: "Narration isn't set up",
  narration_story: "Narration isn't set up",
};

/** What the Overview is built from. `null` means that source couldn't be read. */
export type OverviewInput = {
  waitlistPending: number | null;
  /** Collections with an open report. */
  reported: number | null;
  /** Issue reports nobody has looked at yet. */
  newIssues: number | null;
  /** Collection requests waiting to be accepted, and past their estimate. */
  requests: { waiting: number; overdue: number } | null;
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
      href: AI_FEATURE_META[feature].manageHref,
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
      href: "/admin/ai/credits",
    });
  }

  if (input.creditsEnabled === null) {
    items.push(unreadable("credits-switch", "the AI credits switch"));
  } else if (!input.creditsEnabled) {
    items.push({
      id: "credits-off",
      tone: "warning",
      title: "AI credits are switched off",
      detail: "Nobody can use AI quizzes and Stories, and the Top up button is hidden.",
      href: "/admin/ai/credits",
    });
  }

  if (credits && credits.usersExhausted > 0) {
    const count = credits.usersExhausted;
    items.push({
      id: "exhausted",
      tone: "info",
      title: `${count} ${count === 1 ? "person has" : "people have"} run out of AI credits`,
      detail: "Grant more credits if that's not what you want.",
      href: "/admin/ai/credits",
    });
  }
  return items;
}

function featureItems(featuresOff: FeatureId[] | null): AttentionItem[] {
  if (featuresOff === null) return [unreadable("features", "the AI feature switches")];
  return featuresOff.map((feature) => ({
    id: `off-${feature}`,
    tone: "warning",
    title: `${AI_FEATURE_META[feature].label} is switched off`,
    detail: "It is off for everyone.",
    href: AI_FEATURE_META[feature].manageHref,
  }));
}

/** One tile for a count that only matters when it isn't zero. */
function countItem(
  count: number | null,
  unreadableAs: [id: string, what: string],
  item: Omit<AttentionItem, "title"> & { title: (count: number) => string },
): AttentionItem[] {
  if (count === null) return [unreadable(...unreadableAs)];
  if (count === 0) return [];
  return [{ ...item, title: item.title(count) }];
}

function requestItems(requests: OverviewInput["requests"]): AttentionItem[] {
  if (requests === null) return [unreadable("requests", "collection requests")];
  const { waiting, overdue } = requests;
  if (waiting === 0 && overdue === 0) return [];

  const count = waiting > 0 ? waiting : overdue;
  const parts = [];
  if (waiting > 0) parts.push(`${waiting} waiting to be accepted`);
  if (overdue > 0) parts.push(`${overdue} past ${overdue === 1 ? "its" : "their"} estimate`);
  return [
    {
      id: "requests",
      tone: overdue > 0 ? "warning" : "info",
      title: `${count} collection ${count === 1 ? "request needs" : "requests need"} you`,
      detail: `${parts.join(", ")}.`,
      href: "/admin/requests",
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
            href: "/admin/ai/narration",
          },
        ]
      : []),
    ...countItem(input.waitlistPending, ["waitlist", "the waitlist"], {
      id: "waitlist",
      tone: "info",
      title: (n) => `${n} ${n === 1 ? "person is" : "people are"} waiting for an invite`,
      detail: "Approve them to email a signup link.",
      href: "/admin/people",
    }),
    ...requestItems(input.requests),
    ...countItem(input.reported, ["reports", "collection reports"], {
      id: "reported",
      tone: "warning",
      title: (n) => `${n} ${n === 1 ? "collection" : "collections"} reported`,
      detail: "Members flagged shared collections for a look.",
      href: "/admin/collections?view=reported",
    }),
    ...countItem(input.newIssues, ["issues", "issue reports"], {
      id: "issues",
      tone: "info",
      title: (n) => `${n} new ${n === 1 ? "issue" : "issues"}`,
      detail: "Problems and ideas people sent from the app.",
      href: "/admin/issues",
    }),
  ];
  return items.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}

export type AdminOverview = {
  attention: AttentionItem[];
  /** The latest admin activity; null when it couldn't be read. */
  recent: AuditRow[] | null;
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
  const [
    credits,
    creditsEnabled,
    waitlist,
    reported,
    newIssues,
    requests,
    featuresOff,
    syncNote,
    recent,
  ] = await Promise.allSettled([
    getAiCreditSummaryForAdmin(client),
    readCreditsEnabled(client),
    readWaitlistPending(client),
    readReportedCollections(client),
    readNewIssues(client),
    readRequestsAttention(client),
    readFeaturesOff(client),
    readSyncNote(client),
    recentAudit(client, 8),
  ]);

  const input: OverviewInput = {
    credits: settled("AI credit numbers", credits),
    creditsEnabled: settled("the credits switch", creditsEnabled),
    waitlistPending: settled("the waitlist", waitlist),
    reported: settled("collection reports", reported),
    newIssues: settled("issue reports", newIssues),
    requests: settled("collection requests", requests),
    featuresOff: settled("the feature switches", featuresOff),
    // The sync note is a courtesy: when it can't be read, say nothing about it.
    syncNote: settled("the narration sync", syncNote),
  };

  return {
    attention: buildAttentionItems(input),
    recent: settled("recent activity", recent),
    stats: {
      totalPeople: input.credits?.totalUsers ?? null,
      usedCredits: input.credits?.usersWithUse ?? null,
      creditsSpent: input.credits?.creditsSpent ?? null,
      spends24h: input.credits?.spends24h ?? null,
      waitlistPending: input.waitlistPending,
    },
  };
}
