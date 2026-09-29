import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  admin: true,
  featureRows: [{ feature: "quiz" }] as { feature: string }[],
  featureUpdates: [] as unknown[],
  audits: [] as unknown[],
  revalidated: [] as string[],
}));

vi.mock("next/cache", () => ({ revalidatePath: (path: string) => state.revalidated.push(path) }));
vi.spyOn(console, "error").mockImplementation(() => undefined);
vi.mock("@/lib/auth/require-session", async () => {
  const { AdminError } = await import("@/lib/admin/admin-error");
  return {
    requireAdminClient: async () => {
      if (!state.admin) throw new AdminError("Admins only.");
      return {
        supabase: {
          rpc: (_name: string, args: unknown) => {
            state.audits.push(args);
            return Promise.resolve({ error: null });
          },
          from: () => ({
            update: (values: unknown) => ({
              eq: () => {
                state.featureUpdates.push(values);
                return {
                  select: () => Promise.resolve({ data: state.featureRows, error: null }),
                };
              },
            }),
          }),
        },
      };
    },
  };
});

const { setAiFeatureEnabled } = await import("./actions");

beforeEach(() => {
  state.admin = true;
  state.featureRows = [{ feature: "quiz" }];
  state.featureUpdates = [];
  state.audits = [];
  state.revalidated = [];
});

describe("setAiFeatureEnabled", () => {
  it("writes only the switch for a known feature and refreshes the pages that show it", async () => {
    expect(await setAiFeatureEnabled("quiz", false)).toMatchObject({ ok: true });
    expect(state.featureUpdates).toEqual([{ enabled: false }]);
    expect(state.revalidated).toEqual(["/admin", "/admin/ai", "/admin/ai/credits"]);
    expect(state.audits).toEqual([
      {
        p_action: "app.ai_feature_enabled",
        p_target_type: "feature",
        p_target_id: "quiz",
        p_details: { feature: "quiz", enabled: false },
      },
    ]);
  });

  it("refuses features that aren't switched here, term evaluation included", async () => {
    for (const feature of ["narration_term", "term_evaluation", "nope"]) {
      expect(await setAiFeatureEnabled(feature, true)).toEqual({
        ok: false,
        error: "Unknown feature.",
      });
    }
    expect(state.featureUpdates).toEqual([]);
    expect(state.audits).toEqual([]);
  });

  it("reports an update that changed nothing, as a non-admin's would", async () => {
    state.featureRows = [];
    expect(await setAiFeatureEnabled("story", true)).toEqual({
      ok: false,
      error: "Couldn't change that switch.",
    });
  });

  it("keeps non-admins out", async () => {
    state.admin = false;
    expect(await setAiFeatureEnabled("quiz", true)).toEqual({ ok: false, error: "Admins only." });
    expect(state.featureUpdates).toEqual([]);
  });
});
