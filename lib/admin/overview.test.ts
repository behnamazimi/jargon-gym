import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiCreditSummary } from "@/lib/ai-credits/admin";

const state = vi.hoisted(() => ({
  health: {} as Record<string, string | undefined>,
}));

vi.mock("@/lib/ai/health", () => ({
  featureHealth: (feature: string) =>
    state.health[feature] ? { ok: false, note: state.health[feature] } : { ok: true },
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/narration/sync", () => ({
  getLastNarrationSyncJob: async () => {
    throw new Error("boom");
  },
}));
vi.mock("@/lib/narration/worker-status", () => ({
  getCronStatus: async () => null,
  describeCron: () => null,
}));
vi.mock("@/lib/ai-credits/admin", () => ({
  getAiCreditSummaryForAdmin: async () => {
    throw new Error("rpc failed");
  },
}));
vi.spyOn(console, "error").mockImplementation(() => undefined);

const { buildAttentionItems, loadAdminOverview } = await import("./overview");
type OverviewInput = Parameters<typeof buildAttentionItems>[0];

const summary: AiCreditSummary = {
  totalUsers: 10,
  usersWithUse: 4,
  usersExhausted: 0,
  usersWithOwnKey: 1,
  creditsSpent: 50,
  spends24h: 10,
  refunds24h: 0,
  refundUsers24h: 0,
};

const healthy: OverviewInput = {
  waitlistPending: 0,
  requests: { waiting: 0, overdue: 0 },
  credits: summary,
  creditsEnabled: true,
  featuresOff: [],
  syncNote: null,
};

beforeEach(() => {
  state.health = {};
});

describe("buildAttentionItems", () => {
  it("is empty when everything is fine", () => {
    expect(buildAttentionItems({ ...healthy, featuresOff: [] })).toEqual([]);
  });

  it("puts a missing key above a switched-off feature above the waitlist", () => {
    state.health = { quiz: "The app's own AI key isn't set up." };
    const items = buildAttentionItems({
      ...healthy,
      waitlistPending: 3,
      featuresOff: ["story"],
    });
    expect(items.map((item) => item.id)).toEqual(["health-quiz", "off-story", "waitlist"]);
    expect(items[2]?.title).toBe("3 people are waiting for an invite");
  });

  it("asks for attention on requests, more urgently when some are late", () => {
    const waiting = buildAttentionItems({ ...healthy, requests: { waiting: 2, overdue: 0 } });
    expect(waiting).toEqual([
      expect.objectContaining({
        id: "requests",
        tone: "info",
        title: "2 collection requests need you",
        detail: "2 waiting to be accepted.",
      }),
    ]);

    const late = buildAttentionItems({ ...healthy, requests: { waiting: 1, overdue: 1 } });
    expect(late[0]).toMatchObject({ tone: "warning", title: "1 collection request needs you" });
    expect(late[0]?.detail).toBe("1 waiting to be accepted, 1 past its estimate.");

    const lateOnly = buildAttentionItems({ ...healthy, requests: { waiting: 0, overdue: 3 } });
    expect(lateOnly[0]).toMatchObject({ title: "3 collection requests need you" });
  });

  it("reports one missing-key problem once when features share a note", () => {
    state.health = { quiz: "same note", story: "same note" };
    expect(buildAttentionItems(healthy).filter((i) => i.id.startsWith("health-"))).toHaveLength(1);
  });

  it("flags high refunds, the credits switch, exhausted people and a stalled sync", () => {
    const items = buildAttentionItems({
      ...healthy,
      credits: { ...summary, spends24h: 6, refunds24h: 4, refundUsers24h: 3, usersExhausted: 1 },
      creditsEnabled: false,
      syncNote: "A sync has stalled.",
    });
    expect(items.map((item) => item.id)).toEqual([
      "refunds-high",
      "credits-off",
      "sync",
      "exhausted",
    ]);
  });

  it("says a source couldn't be read instead of pretending all is well", () => {
    const items = buildAttentionItems({
      waitlistPending: null,
      requests: null,
      credits: null,
      creditsEnabled: null,
      featuresOff: null,
      syncNote: null,
    });
    expect(items.map((item) => item.id).sort()).toEqual([
      "unreadable-credits",
      "unreadable-credits-switch",
      "unreadable-features",
      "unreadable-requests",
      "unreadable-waitlist",
    ]);
  });
});

describe("loadAdminOverview", () => {
  it("survives every source failing", async () => {
    const fail = { data: null, error: new Error("nope"), count: null };
    const query = () => {
      const node: Record<string, unknown> = {};
      const settle = () => Object.assign(Promise.resolve(fail), node);
      for (const method of ["select", "eq", "single"]) node[method] = settle;
      return node;
    };
    const overview = await loadAdminOverview({ from: query } as never);

    expect(overview.stats).toEqual({
      totalPeople: null,
      usedCredits: null,
      creditsSpent: null,
      spends24h: null,
      waitlistPending: null,
    });
    expect(overview.attention.length).toBeGreaterThan(0);
    expect(overview.recent).toBeNull();
  });
});
