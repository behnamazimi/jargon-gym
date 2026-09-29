import { beforeEach, describe, expect, it, vi } from "vitest";

const deleteAudio = vi.fn();
vi.mock("./storage", () => ({ deleteAudio }));

const { sweepSupersededAudio } = await import("./sweep");

type Row = { id: string; status: string; storage_path: string | null; updated_at: string };

const OLD = "2026-01-01T00:00:00.000Z";

function fakeClient(rows: Row[], options: { failClear?: boolean } = {}) {
  return {
    from() {
      const filters: Record<string, unknown> = {};
      const negated: Record<string, unknown> = {};
      let mode: "select" | "update" = "select";
      let patch: Record<string, unknown> = {};
      function matching() {
        return rows.filter(
          (row) =>
            Object.entries(filters).every(([key, value]) => (row as never)[key] === value) &&
            Object.entries(negated).every(([key, value]) => (row as never)[key] !== value),
        );
      }
      function runUpdate() {
        if (options.failClear) return { data: null, error: new Error("db") };
        for (const row of matching()) Object.assign(row, patch);
        return { data: [], error: null };
      }
      const builder: Record<string, unknown> = {
        select: () => {
          if (mode === "update") return Promise.resolve(runUpdate());
          return builder;
        },
        update: (values: Record<string, unknown>) => {
          mode = "update";
          patch = values;
          return builder;
        },
        eq: (key: string, value: unknown) => {
          filters[key] = value;
          return builder;
        },
        neq: (key: string, value: unknown) => {
          negated[key] = value;
          return builder;
        },
        not: () => builder,
        lt: () => builder,
        order: () => builder,
        limit: () => Promise.resolve({ data: matching(), error: null }),
      };
      return builder;
    },
  } as never;
}

beforeEach(() => {
  vi.resetAllMocks();
  deleteAudio.mockResolvedValue(undefined);
});

describe("sweepSupersededAudio", () => {
  it("deletes the file of a superseded job and clears its path", async () => {
    const rows: Row[] = [
      { id: "a", status: "superseded", storage_path: "audio/term/t/2/h/a.mp3", updated_at: OLD },
    ];
    expect(await sweepSupersededAudio(fakeClient(rows))).toBe(1);
    expect(deleteAudio).toHaveBeenCalledWith("audio/term/t/2/h/a.mp3");
    expect(rows[0]?.storage_path).toBeNull();
  });

  it("keeps a file that a live job also uses, but still clears the old path", async () => {
    const rows: Row[] = [
      { id: "old", status: "superseded", storage_path: "t.mp3", updated_at: OLD },
      { id: "live", status: "ready", storage_path: "t.mp3", updated_at: OLD },
    ];
    expect(await sweepSupersededAudio(fakeClient(rows))).toBe(1);
    expect(deleteAudio).not.toHaveBeenCalled();
    expect(rows[0]?.storage_path).toBeNull();
    expect(rows[1]?.storage_path).toBe("t.mp3");
  });

  it("leaves the path in place when the delete fails, so the next call retries", async () => {
    deleteAudio.mockRejectedValue(new Error("s3 down"));
    const rows: Row[] = [
      { id: "a", status: "superseded", storage_path: "audio/x.mp3", updated_at: OLD },
    ];
    expect(await sweepSupersededAudio(fakeClient(rows))).toBe(0);
    expect(rows[0]?.storage_path).toBe("audio/x.mp3");
  });

  it("does not count a row whose path could not be cleared", async () => {
    const rows: Row[] = [
      { id: "a", status: "superseded", storage_path: "audio/x.mp3", updated_at: OLD },
    ];
    expect(await sweepSupersededAudio(fakeClient(rows, { failClear: true }))).toBe(0);
  });

  it("stops when its time budget is spent", async () => {
    const rows: Row[] = [
      { id: "a", status: "superseded", storage_path: "audio/a.mp3", updated_at: OLD },
      { id: "b", status: "superseded", storage_path: "audio/b.mp3", updated_at: OLD },
    ];
    expect(await sweepSupersededAudio(fakeClient(rows), { budgetMs: 0 })).toBe(0);
    expect(deleteAudio).not.toHaveBeenCalled();
  });
});
