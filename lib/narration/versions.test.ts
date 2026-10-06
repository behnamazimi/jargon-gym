import { beforeEach, describe, expect, it, vi } from "vitest";

const getNarrationAccessForUser = vi.fn();
const getNarrationModes = vi.fn();
const loadLiveJobs = vi.fn();
const isCurrentAudio = vi.fn();
const terms = vi.hoisted(() => ({ rows: [] as unknown[], error: null as unknown }));

vi.mock("./access", () => ({ getNarrationAccessForUser }));
vi.mock("./mode", () => ({ DEFAULT_NARRATION_MODE: "term", getNarrationModes }));
vi.mock("./sync-missing", () => ({
  TERM_FIELD_COLUMNS: "id",
  chunkIds: (ids: string[]) => [ids],
  isCurrentAudio,
  loadLiveJobs,
}));

const { attachNarrationVersions, loadNarrationVersions } = await import("./versions");

const admin = {
  from: () => ({
    select: () => ({
      in: () => ({ not: async () => ({ data: terms.rows, error: terms.error }) }),
    }),
  }),
} as never;

const row = (id: string, domain = "d1") => ({ id, domain_id: domain });

beforeEach(() => {
  vi.resetAllMocks();
  terms.rows = [row("a"), row("b"), row("c")];
  terms.error = null;
  getNarrationAccessForUser.mockResolvedValue(true);
  getNarrationModes.mockResolvedValue(new Map());
  loadLiveJobs.mockResolvedValue(
    new Map([
      ["a", { id: "job-a" }],
      ["b", { id: "job-b" }],
    ]),
  );
  isCurrentAudio.mockImplementation((term: { id: string }) => term.id === "a");
});

describe("loadNarrationVersions", () => {
  it("returns the job id only for a current clip", async () => {
    const versions = await loadNarrationVersions(admin, ["a", "b", "c"]);
    expect(versions).toEqual(
      new Map([
        ["a", "job-a"],
        ["b", null],
        ["c", null],
      ]),
    );
  });

  it("answers null for a term it could not read", async () => {
    terms.rows = [];
    expect((await loadNarrationVersions(admin, ["a"])).get("a")).toBeNull();
  });

  it("does not query for no terms", async () => {
    expect((await loadNarrationVersions(admin, [])).size).toBe(0);
    expect(loadLiveJobs).not.toHaveBeenCalled();
  });
});

describe("attachNarrationVersions", () => {
  it("leaves terms untouched without narration access", async () => {
    getNarrationAccessForUser.mockResolvedValue(false);
    const input = [{ id: "a" }];
    expect(await attachNarrationVersions(admin, "u", input)).toBe(input);
    expect(loadLiveJobs).not.toHaveBeenCalled();
  });

  it("sets the version, or null when there is no current clip", async () => {
    expect(await attachNarrationVersions(admin, "u", [{ id: "a" }, { id: "c" }])).toEqual([
      { id: "a", narrationVersion: "job-a" },
      { id: "c", narrationVersion: null },
    ]);
  });

  it("falls back to untouched terms when the lookup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    loadLiveJobs.mockRejectedValue(new Error("db down"));
    const input = [{ id: "a" }];
    expect(await attachNarrationVersions(admin, "u", input)).toBe(input);
  });
});
