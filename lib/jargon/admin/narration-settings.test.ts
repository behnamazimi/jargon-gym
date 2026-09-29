import { describe, expect, it, vi } from "vitest";
import { getNarrationSettingsForAdmin } from "./narration-settings";

vi.spyOn(console, "error").mockImplementation(() => undefined);

function client(usageError: boolean) {
  return {
    from: (table: string) => {
      const node: Record<string, unknown> = {};
      const result = () =>
        table === "ai_feature_settings"
          ? {
              data: [
                { feature: "narration_term", enabled: true, daily_cap: null },
                { feature: "narration_story", enabled: true, daily_cap: 20 },
              ],
              error: null,
            }
          : { count: 7, error: usageError ? new Error("x") : null };
      const settle = () => Object.assign(Promise.resolve(result()), node);
      for (const method of ["select", "in", "eq", "gte"]) node[method] = settle;
      return node;
    },
  } as never;
}

describe("getNarrationSettingsForAdmin", () => {
  it("reports the caps and usage", async () => {
    expect(await getNarrationSettingsForAdmin(client(false))).toEqual({
      enabled: true,
      caps: { term: null, story: 20 },
      usageLast24h: { term: 7, story: 7 },
    });
  });

  it("shows usage as unknown, not zero, when the count can't be read", async () => {
    const settings = await getNarrationSettingsForAdmin(client(true));
    expect(settings.usageLast24h).toEqual({ term: null, story: null });
  });
});
