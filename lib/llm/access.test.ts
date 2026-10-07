import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

const central = vi.hoisted(() => ({ config: null as { provider: string; apiKey: string } | null }));
const credits = vi.hoisted(() => ({ state: null as unknown, fail: false, calls: 0 }));
const feature = vi.hoisted(() => ({
  settings: null as unknown,
  readError: null as Error | null,
  isAdmin: false,
  onAllowlist: false,
  allowlistCalls: 0,
}));

vi.mock("./central", () => ({ getCentralLlmConfig: () => central.config }));
vi.mock("@/lib/ai-credits/repository", () => ({
  getMyCreditState: async () => {
    credits.calls += 1;
    if (credits.fail) throw new Error("rpc failed");
    return credits.state;
  },
}));
vi.mock("@/lib/ai/feature-settings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/feature-settings")>()),
  getFeatureSettings: async () => {
    if (feature.readError) throw feature.readError;
    return feature.settings;
  },
  isOnFeatureAllowlist: async () => {
    feature.allowlistCalls += 1;
    return feature.onAllowlist;
  },
}));
vi.mock("@/lib/auth/require-session", () => ({ getUserIsAdmin: async () => feature.isAdmin }));

const { getAiAccessView, resolveAiAccess } = await import("./access");

const client = {} as SupabaseClient<Database>;
const costs = { quizPerQuestion: 1, storyPerTerm: 1 };

function featureRow(overrides: Record<string, unknown>) {
  return {
    feature: "quiz",
    billable: true,
    enabled: true,
    accessMode: "everyone",
    dailyCap: null,
    creditCost: 1,
    unit: "question",
    ...overrides,
  };
}

const resolve = () => resolveAiAccess(client, client, "u1", "quiz");

function state(remaining: number, enabled = true) {
  return { enabled, total: 130, remaining, costs };
}

beforeEach(() => {
  central.config = { provider: "google", apiKey: "central-key" };
  credits.state = state(50);
  credits.fail = false;
  credits.calls = 0;
  feature.settings = featureRow({});
  feature.readError = null;
  feature.isAdmin = false;
  feature.onAllowlist = false;
  feature.allowlistCalls = 0;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("resolveAiAccess", () => {
  it("uses credits with the app's key", async () => {
    expect(await resolve()).toEqual({
      kind: "credits",
      provider: "google",
      apiKey: "central-key",
      remaining: 50,
      costs,
    });
  });

  it("is unavailable when the app has no key", async () => {
    central.config = null;
    expect(await resolve()).toEqual({ kind: "unavailable", reason: "none" });
  });

  it("is unavailable when credits are switched off", async () => {
    credits.state = state(50, false);
    expect(await resolve()).toEqual({ kind: "unavailable", reason: "none" });
  });

  it("says exhausted once the balance is empty", async () => {
    credits.state = state(0);
    expect(await resolve()).toEqual({
      kind: "unavailable",
      reason: "exhausted",
    });
  });
});

describe("resolveAiAccess feature policy", () => {
  it("blocks everyone, admins included, when the feature is off", async () => {
    feature.settings = featureRow({ enabled: false });
    feature.isAdmin = true;
    expect(await resolve()).toEqual({ kind: "unavailable", reason: "feature-off" });
  });

  it("treats a missing feature row as off", async () => {
    feature.settings = null;
    expect(await resolve()).toEqual({ kind: "unavailable", reason: "feature-off" });
  });

  it("lets the request through only when the settings table isn't there yet", async () => {
    feature.readError = Object.assign(new Error("relation does not exist"), { code: "42P01" });
    expect(await resolve()).toMatchObject({ kind: "credits" });
  });

  it("does not let a restricted feature through because a read failed", async () => {
    feature.settings = featureRow({ enabled: false });
    feature.readError = Object.assign(new Error("permission denied"), { code: "42501" });
    await expect(resolve()).rejects.toThrow("permission denied");
  });

  it("asks nothing extra when the feature is open to everyone", async () => {
    await resolve();
    expect(feature.allowlistCalls).toBe(0);
  });

  it("needs an allowlist row in allowlist mode, and lets admins in without one", async () => {
    feature.settings = featureRow({ accessMode: "allowlist" });
    expect(await resolve()).toEqual({ kind: "unavailable", reason: "feature-off" });

    feature.onAllowlist = true;
    expect(await resolve()).toMatchObject({ kind: "credits" });

    feature.onAllowlist = false;
    feature.isAdmin = true;
    expect(await resolve()).toMatchObject({ kind: "credits" });
    expect(feature.allowlistCalls).toBe(2);
  });

  it("keeps admin mode to admins", async () => {
    feature.settings = featureRow({ accessMode: "admin" });
    expect(await resolve()).toEqual({ kind: "unavailable", reason: "feature-off" });
    feature.isAdmin = true;
    expect(await resolve()).toMatchObject({ kind: "credits" });
  });
});

describe("getAiAccessView", () => {
  it("shows the balance for users on credits, with no secrets", async () => {
    const view = await getAiAccessView(client);
    expect(view).toEqual({
      kind: "credits",
      providerLabel: "Google",
      remaining: 50,
      total: 130,
      costs,
    });
    expect(JSON.stringify(view)).not.toContain("central-key");
  });
});
