import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeNarrationHash } from "./content-hash-v2";
import type { NarrationMode } from "./mode";

const getNarrationAccessForUser = vi.fn();
const getNarrationModes = vi.fn();
const loadLiveJobs = vi.fn();
const db = vi.hoisted(() => ({
  terms: [] as Record<string, unknown>[],
  queries: [] as string[][],
}));

vi.mock("./access", () => ({ getNarrationAccessForUser }));
vi.mock("./mode", () => ({ DEFAULT_NARRATION_MODE: "term", getNarrationModes }));
// Real hashing and chunking; only the database reads are replaced.
vi.mock("./sync-missing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./sync-missing")>()),
  loadLiveJobs,
}));

const { attachNarrationVersions, loadNarrationVersions } = await import("./versions");

const admin = {
  from: () => ({
    select: () => ({
      in: (_column: string, ids: string[]) => {
        db.queries.push(ids);
        return {
          not: async () => ({
            data: db.terms.filter((term) => ids.includes(term.id as string)),
            error: null,
          }),
        };
      },
    }),
  }),
} as never;

const FIELDS = {
  term: "idempotent",
  definition: "Safe to repeat.",
  example: "PUT",
  mental_model: null,
  discussion: null,
  anti_example: null,
  controversy: null,
};

function term(id: string, domain = "d-term", fields = FIELDS) {
  return { id, domain_id: domain, domains: { language: "en" }, ...fields };
}

function job(
  id: string,
  mode: NarrationMode,
  overrides: Record<string, unknown> = {},
  fields = FIELDS,
) {
  return {
    id,
    status: "ready",
    storage_path: `terms/${id}.mp3`,
    hash_version: 2,
    content_hash: computeNarrationHash(mode, fields, "en"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  db.terms = [];
  db.queries = [];
  getNarrationAccessForUser.mockResolvedValue(true);
  getNarrationModes.mockResolvedValue(
    new Map<string, NarrationMode>([
      ["d-term", "term"],
      ["d-full", "full"],
    ]),
  );
  loadLiveJobs.mockResolvedValue(new Map());
});

describe("loadNarrationVersions", () => {
  it("returns the job id only for a clip that matches what would be spoken now", async () => {
    const renamed = { ...FIELDS, term: "idempotence" };
    db.terms = [
      term("current"),
      term("renamed", "d-term", renamed),
      term("pending"),
      term("failed"),
      term("none"),
    ];
    loadLiveJobs.mockResolvedValue(
      new Map([
        ["current", job("job-current", "term")],
        // made for the old name
        ["renamed", job("job-renamed", "term")],
        ["pending", job("job-pending", "term", { status: "pending", storage_path: null })],
        ["failed", job("job-failed", "term", { status: "failed" })],
      ]),
    );

    expect(
      await loadNarrationVersions(admin, ["current", "renamed", "pending", "failed", "none"]),
    ).toEqual(
      new Map([
        ["current", "job-current"],
        ["renamed", null],
        ["pending", null],
        ["failed", null],
        ["none", null],
      ]),
    );
  });

  it("judges each term by its own collection's mode", async () => {
    const edited = { ...FIELDS, definition: "Changed." };
    db.terms = [term("name-only", "d-term", edited), term("full", "d-full", edited)];
    // Both clips were made from the unedited text.
    loadLiveJobs.mockResolvedValue(
      new Map([
        ["name-only", job("job-a", "term", {}, FIELDS)],
        ["full", job("job-b", "full", {}, FIELDS)],
      ]),
    );

    const versions = await loadNarrationVersions(admin, ["name-only", "full"]);
    // A definition edit doesn't matter when only the name is spoken.
    expect(versions.get("name-only")).toBe("job-a");
    expect(versions.get("full")).toBeNull();
  });

  it("answers null for a term it could not read", async () => {
    expect((await loadNarrationVersions(admin, ["gone"])).get("gone")).toBeNull();
  });

  it("reads terms in chunks so the id filter stays short", async () => {
    const ids = Array.from({ length: 81 }, (_, i) => `t${i}`);
    db.terms = ids.map((id) => term(id));
    loadLiveJobs.mockResolvedValue(new Map([["t80", job("job-80", "term")]]));

    const versions = await loadNarrationVersions(admin, ids);
    expect(db.queries.map((chunk) => chunk.length)).toEqual([80, 1]);
    expect(versions.get("t80")).toBe("job-80");
    expect(versions.size).toBe(81);
  });

  it("does not query for no terms", async () => {
    expect((await loadNarrationVersions(admin, [])).size).toBe(0);
    expect(loadLiveJobs).not.toHaveBeenCalled();
  });
});

describe("attachNarrationVersions", () => {
  it("leaves terms untouched without narration access", async () => {
    getNarrationAccessForUser.mockResolvedValue(false);
    const input = [{ id: "current" }];
    expect(await attachNarrationVersions(admin, "u", input)).toBe(input);
    expect(loadLiveJobs).not.toHaveBeenCalled();
  });

  it("sets the version, or null when there is no current clip", async () => {
    db.terms = [term("current"), term("none")];
    loadLiveJobs.mockResolvedValue(new Map([["current", job("job-current", "term")]]));
    expect(await attachNarrationVersions(admin, "u", [{ id: "current" }, { id: "none" }])).toEqual([
      { id: "current", narrationVersion: "job-current" },
      { id: "none", narrationVersion: null },
    ]);
  });

  it("falls back to untouched terms when the lookup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    loadLiveJobs.mockRejectedValue(new Error("db down"));
    db.terms = [term("current")];
    const input = [{ id: "current" }];
    expect(await attachNarrationVersions(admin, "u", input)).toBe(input);
  });
});
