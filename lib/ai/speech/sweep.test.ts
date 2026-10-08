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
      let mode: "select" | "update" | "delete" = "select";
      let patch: Record<string, unknown> = {};
      function matching() {
        return rows.filter(
          (row) =>
            Object.entries(filters).every(([key, value]) => (row as never)[key] === value) &&
            Object.entries(negated).every(([key, value]) => (row as never)[key] !== value),
        );
      }
      function runWrite() {
        if (options.failClear) return { data: null, error: new Error("db") };
        if (mode === "delete") {
          for (const row of matching()) rows.splice(rows.indexOf(row), 1);
        } else {
          for (const row of matching()) Object.assign(row, patch);
        }
        return { data: [], error: null };
      }
      const builder: Record<string, unknown> = {
        select: () => {
          if (mode !== "select") return Promise.resolve(runWrite());
          return builder;
        },
        delete: () => {
          mode = "delete";
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
  it("deletes the file of a superseded job and the job itself", async () => {
    const rows: Row[] = [
      { id: "a", status: "superseded", storage_path: "terms/t/2/h/a.mp3", updated_at: OLD },
    ];
    expect(await sweepSupersededAudio(fakeClient(rows))).toBe(1);
    expect(deleteAudio).toHaveBeenCalledWith("terms/t/2/h/a.mp3");
    expect(rows).toEqual([]);
  });

  it("keeps a file that a live job also uses, but still deletes the old job", async () => {
    const rows: Row[] = [
      { id: "old", status: "superseded", storage_path: "t.mp3", updated_at: OLD },
      { id: "live", status: "ready", storage_path: "t.mp3", updated_at: OLD },
    ];
    expect(await sweepSupersededAudio(fakeClient(rows))).toBe(1);
    expect(deleteAudio).not.toHaveBeenCalled();
    expect(rows.map((row) => row.id)).toEqual(["live"]);
  });

  it("leaves the job in place when the file delete fails, so the next call retries", async () => {
    deleteAudio.mockRejectedValue(new Error("s3 down"));
    const rows: Row[] = [
      { id: "a", status: "superseded", storage_path: "audio/x.mp3", updated_at: OLD },
    ];
    expect(await sweepSupersededAudio(fakeClient(rows))).toBe(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.storage_path).toBe("audio/x.mp3");
  });

  it("does not count a job that could not be deleted", async () => {
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
