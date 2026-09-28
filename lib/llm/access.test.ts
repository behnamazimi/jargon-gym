import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

const central = vi.hoisted(() => ({ config: null as { provider: string; apiKey: string } | null }));
const credits = vi.hoisted(() => ({ state: null as unknown }));
const own = vi.hoisted(() => ({ key: null as unknown, settings: null as unknown }));

vi.mock("./central", () => ({ getCentralLlmConfig: () => central.config }));
vi.mock("@/lib/ai-credits/repository", () => ({ getMyCreditState: async () => credits.state }));
vi.mock("./settings", () => ({
  getDecryptedApiKey: async () => own.key,
  getUserSettings: async () => own.settings,
}));

const { getAiAccessView, resolveAiAccess } = await import("./access");

const client = {} as SupabaseClient<Database>;
const costs = { quizPerQuestion: 1, storyPerTerm: 1 };

function state(remaining: number, enabled = true) {
  return { enabled, total: 130, remaining, costs };
}

beforeEach(() => {
  central.config = { provider: "google", apiKey: "central-key" };
  credits.state = state(50);
  own.key = null;
  own.settings = null;
});

describe("resolveAiAccess", () => {
  it("prefers the user's own key over credits", async () => {
    own.key = { provider: "anthropic", apiKey: "own-key" };
    expect(await resolveAiAccess(client, "u1")).toEqual({
      kind: "own",
      provider: "anthropic",
      apiKey: "own-key",
    });
  });

  it("falls back to credits with the app's key", async () => {
    expect(await resolveAiAccess(client, "u1")).toEqual({
      kind: "credits",
      provider: "google",
      apiKey: "central-key",
      remaining: 50,
      costs,
    });
  });

  it("is unavailable when the app has no key", async () => {
    central.config = null;
    expect(await resolveAiAccess(client, "u1")).toEqual({ kind: "unavailable", reason: "none" });
  });

  it("is unavailable when credits are switched off", async () => {
    credits.state = state(50, false);
    expect(await resolveAiAccess(client, "u1")).toEqual({ kind: "unavailable", reason: "none" });
  });

  it("says exhausted once the balance is empty", async () => {
    credits.state = state(0);
    expect(await resolveAiAccess(client, "u1")).toEqual({
      kind: "unavailable",
      reason: "exhausted",
    });
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
