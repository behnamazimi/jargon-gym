import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

const central = vi.hoisted(() => ({ config: null as { provider: string; apiKey: string } | null }));
const credits = vi.hoisted(() => ({ state: null as unknown, fail: false, calls: 0 }));
const own = vi.hoisted(() => ({
  key: null as unknown,
  settings: null as unknown,
  keyError: null as Error | null,
}));
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
vi.mock("./settings", () => ({
  getDecryptedApiKey: async () => {
    if (own.keyError) throw own.keyError;
    return own.key;
  },
  getUserSettings: async () => own.settings,
  UnreadableKeyError: class UnreadableKeyError extends Error {},
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
const { UnreadableKeyError } = await import("./settings");

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
  own.key = null;
  own.settings = null;
  own.keyError = null;
  feature.settings = featureRow({});
  feature.readError = null;
  feature.isAdmin = false;
  feature.onAllowlist = false;
  feature.allowlistCalls = 0;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("resolveAiAccess", () => {
  it("prefers the user's own key over credits, without asking for a balance", async () => {
    own.key = { provider: "anthropic", apiKey: "own-key" };
    expect(await resolve()).toEqual({
      kind: "own",
      provider: "anthropic",
      apiKey: "own-key",
    });
    expect(credits.calls).toBe(0);
  });

  it("falls back to credits with the app's key", async () => {
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
  it("blocks everyone, own-key users and admins included, when the feature is off", async () => {
    own.key = { provider: "anthropic", apiKey: "own-key" };
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

  it("never falls back to credits for a saved key that can't be read", async () => {
    own.keyError = new UnreadableKeyError();
    expect(await resolve()).toEqual({ kind: "unavailable", reason: "key-unreadable" });
    expect(credits.calls).toBe(0);
  });

  it("does not swallow other key errors", async () => {
    own.keyError = new Error("database down");
    await expect(resolve()).rejects.toThrow("database down");
    expect(credits.calls).toBe(0);
  });
});

describe("getAiAccessView", () => {
  it("shows the balance for users on credits, with no secrets", async () => {
    const view = await getAiAccessView(client, "u1");
    expect(view).toEqual({
      kind: "credits",
      providerLabel: "Google",
      remaining: 50,
      total: 130,
      costs,
    });
    expect(JSON.stringify(view)).not.toContain("central-key");
  });

  it("tells own-key users whether credits would take over", async () => {
    own.settings = { provider: "anthropic", apiKeyLast4: "abcd" };
    expect(await getAiAccessView(client, "u1")).toEqual({
      kind: "own",
      providerLabel: "Anthropic",
      creditsRemaining: 50,
    });

    credits.state = state(0);
    expect(await getAiAccessView(client, "u1")).toMatchObject({
      kind: "own",
      creditsRemaining: null,
    });

    central.config = null;
    expect(await getAiAccessView(client, "u1")).toMatchObject({
      kind: "own",
      creditsRemaining: null,
    });
  });
});
