import { describe, expect, it, vi } from "vitest";
import { getProviderSwitches } from "./switches";

function client(result: { data: unknown; error: unknown }) {
  const eq = vi.fn(() => ({ single: async () => result }));
  const select = vi.fn(() => ({ eq }));
  return { admin: { from: vi.fn(() => ({ select })) } as never, eq };
}

describe("getProviderSwitches", () => {
  it("reads the row of the narration feature for the clip type", async () => {
    const row = { data: { murf_enabled: true, elevenlabs_enabled: false }, error: null };
    const term = client(row);
    expect(await getProviderSwitches(term.admin, "term")).toEqual({
      murf: true,
      elevenlabs: false,
    });
    expect(term.eq).toHaveBeenCalledWith("feature", "narration_term");

    const story = client(row);
    await getProviderSwitches(story.admin, "story");
    expect(story.eq).toHaveBeenCalledWith("feature", "narration_story");
  });

  it("throws when the row can't be read", async () => {
    const failing = client({ data: null, error: new Error("missing") });
    await expect(getProviderSwitches(failing.admin, "term")).rejects.toThrow("missing");
  });
});
