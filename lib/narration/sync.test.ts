import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { computeContentHash } from "./content-hash";
import type { NarratedTermFields } from "./types";

vi.mock("next/server", () => ({
  after: (fn: () => unknown) => fn(),
}));

vi.mock("./service", () => ({
  getOrGenerateNarration: vi.fn(),
}));

const { getOrGenerateNarration } = await import("./service");
const {
  cancelNarrationSync,
  enqueueNarrationSync,
  isCurrentNarration,
  listCollectionNarrationCoverage,
  listMissingNarrationTermIds,
  processNarrationSyncTick,
} = await import("./sync");
const { canResumeNarrationSync } = await import("./sync-shared");

type Client = SupabaseClient<Database>;
type JobRow = Database["public"]["Tables"]["narration_sync_jobs"]["Row"];

const DOMAIN_ID = "dom-1";
const USER_ID = "user-1";
const FIELDS: NarratedTermFields = {
  term: "Closure",
  definition: "A function bundled with its lexical scope.",
  example: null,
  mental_model: null,
  discussion: null,
  anti_example: null,
  controversy: null,
};
const HASH = computeContentHash(FIELDS);

function termRow(id: string, domainId = DOMAIN_ID) {
  return { id, domain_id: domainId, ...FIELDS };
}

function jobRow(overrides: Partial<JobRow> = {}): JobRow {
  return {
    id: "job-1",
    domain_id: DOMAIN_ID,
    started_by: USER_ID,
    status: "queued",
    term_ids: ["term-1", "term-2"],
    cursor: 0,
    generated_count: 0,
    failed_count: 0,
    last_error: null,
    lease_expires_at: null,
    created_at: "2026-09-20T00:00:00.000Z",
    updated_at: "2026-09-20T00:00:00.000Z",
    finished_at: null,
    ...overrides,
  };
}

type Store = {
  enabled: boolean;
  jobs: JobRow[];
  terms: ReturnType<typeof termRow>[];
  narrations: {
    term_id: string;
    status: string;
    content_hash: string;
    storage_path: string | null;
  }[];
  domains: { id: string; name: string }[];
  claim: { job_id: string; term_id: string; cursor: number; term_count: number }[];
  insertErrorCode?: string;
};

function makeClient(store: Store): Client {
  function matches(row: Record<string, unknown>, filters: Record<string, unknown>) {
    return Object.entries(filters).every(([key, value]) => row[key] === value);
  }

  function rowsFor(table: string) {
    if (table === "terms") return store.terms;
    if (table === "term_narrations") return store.narrations;
    if (table === "domains") return store.domains;
    if (table === "narration_sync_jobs") return store.jobs;
    if (table === "narration_settings") return [{ id: true, enabled: store.enabled }];
    return [];
  }

  function execute(
    table: string,
    op: string,
    filters: Record<string, unknown>,
    inFilters: Record<string, unknown[]>,
    patch: Record<string, unknown> | null,
    insertRow: Record<string, unknown> | null,
    mode: "list" | "single" | "maybe",
  ) {
    let rows = rowsFor(table) as Record<string, unknown>[];
    rows = rows.filter((row) => matches(row, filters));
    for (const [key, values] of Object.entries(inFilters)) {
      rows = rows.filter((row) => values.includes(row[key] as never));
    }

    if (op === "insert") {
      if (store.insertErrorCode) {
        return { data: null, error: { code: store.insertErrorCode, message: "conflict" } };
      }
      const created = jobRow({
        ...(insertRow as Partial<JobRow>),
        id: "job-new",
        cursor: 0,
        generated_count: 0,
        failed_count: 0,
        last_error: null,
        lease_expires_at: null,
        created_at: "2026-09-20T00:00:00.000Z",
        updated_at: "2026-09-20T00:00:00.000Z",
        finished_at: null,
      });
      store.jobs.push(created);
      return { data: created, error: null };
    }

    if (op === "update" && patch) {
      for (const row of rows) {
        Object.assign(row, patch);
      }
    }

    if (mode === "list") return { data: rows, error: null };
    if (mode === "single")
      return { data: rows[0] ?? null, error: rows[0] ? null : { message: "missing" } };
    return { data: rows[0] ?? null, error: null };
  }

  return {
    from(table: string) {
      const state = {
        op: "select",
        filters: {} as Record<string, unknown>,
        inFilters: {} as Record<string, unknown[]>,
        patch: null as Record<string, unknown> | null,
        insertRow: null as Record<string, unknown> | null,
      };

      const builder: Record<string, unknown> = {};
      const finish = (mode: "list" | "single" | "maybe") =>
        Promise.resolve(
          execute(
            table,
            state.op,
            state.filters,
            state.inFilters,
            state.patch,
            state.insertRow,
            mode,
          ),
        );

      Object.assign(builder, {
        select: () => builder,
        insert: (row: Record<string, unknown>) => {
          state.op = "insert";
          state.insertRow = row;
          return builder;
        },
        update: (patch: Record<string, unknown>) => {
          state.op = "update";
          state.patch = patch;
          return builder;
        },
        eq: (column: string, value: unknown) => {
          state.filters[column] = value;
          return builder;
        },
        in: (column: string, values: unknown[]) => {
          state.inFilters[column] = values;
          return builder;
        },
        order: () => builder,
        limit: (count: number) => (count <= 1 ? builder : finish("list")),
        range: () => finish("list"),
        single: () => finish("single"),
        maybeSingle: () => finish("maybe"),
      });
      return builder;
    },
    rpc: () => Promise.resolve({ data: store.claim, error: null }),
  } as unknown as Client;
}

function emptyStore(overrides: Partial<Store> = {}): Store {
  return {
    enabled: true,
    jobs: [],
    terms: [],
    narrations: [],
    domains: [{ id: DOMAIN_ID, name: "Product" }],
    claim: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(getOrGenerateNarration).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isCurrentNarration", () => {
  it("is true only for ready audio that matches the current hash", () => {
    expect(isCurrentNarration(FIELDS, null)).toBe(false);
    expect(
      isCurrentNarration(FIELDS, {
        status: "ready",
        content_hash: HASH,
        storage_path: "term-1.mp3",
      }),
    ).toBe(true);
    expect(
      isCurrentNarration(FIELDS, {
        status: "failed",
        content_hash: HASH,
        storage_path: null,
      }),
    ).toBe(false);
    expect(
      isCurrentNarration(FIELDS, {
        status: "pending",
        content_hash: HASH,
        storage_path: null,
      }),
    ).toBe(false);
    expect(
      isCurrentNarration(FIELDS, {
        status: "ready",
        content_hash: "stale",
        storage_path: "term-1.mp3",
      }),
    ).toBe(false);
  });
});

describe("listMissingNarrationTermIds", () => {
  it("returns terms with no row, failed, pending, or a stale hash", async () => {
    const store = emptyStore({
      terms: [termRow("t-missing"), termRow("t-ready"), termRow("t-failed"), termRow("t-stale")],
      narrations: [
        { term_id: "t-ready", status: "ready", content_hash: HASH, storage_path: "t-ready.mp3" },
        { term_id: "t-failed", status: "failed", content_hash: HASH, storage_path: null },
        { term_id: "t-stale", status: "ready", content_hash: "old", storage_path: "t-stale.mp3" },
      ],
    });

    await expect(listMissingNarrationTermIds(makeClient(store), DOMAIN_ID)).resolves.toEqual([
      "t-missing",
      "t-failed",
      "t-stale",
    ]);
  });
});

describe("listCollectionNarrationCoverage", () => {
  it("counts missing terms per collection", async () => {
    const store = emptyStore({
      terms: [termRow("t1"), termRow("t2"), termRow("other", "dom-2")],
      narrations: [{ term_id: "t1", status: "ready", content_hash: HASH, storage_path: "t1.mp3" }],
    });

    await expect(
      listCollectionNarrationCoverage(makeClient(store), [
        { id: DOMAIN_ID, name: "Product" },
        { id: "dom-2", name: "Other" },
      ]),
    ).resolves.toEqual([
      { domainId: DOMAIN_ID, name: "Product", missingCount: 1 },
      { domainId: "dom-2", name: "Other", missingCount: 1 },
    ]);
  });
});

describe("enqueueNarrationSync", () => {
  it("rejects when narration is turned off", async () => {
    const store = emptyStore({ enabled: false, terms: [termRow("t1")] });
    await expect(enqueueNarrationSync(makeClient(store), DOMAIN_ID, USER_ID)).rejects.toThrow(
      "Narration is turned off.",
    );
  });

  it("rejects when a job is already running", async () => {
    const store = emptyStore({
      terms: [termRow("t1")],
      jobs: [jobRow({ status: "running" })],
    });
    await expect(enqueueNarrationSync(makeClient(store), DOMAIN_ID, USER_ID)).rejects.toThrow(
      "A sync is already running.",
    );
  });

  it("rejects when every term already has current audio", async () => {
    const store = emptyStore({
      terms: [termRow("t1")],
      narrations: [{ term_id: "t1", status: "ready", content_hash: HASH, storage_path: "t1.mp3" }],
    });
    await expect(enqueueNarrationSync(makeClient(store), DOMAIN_ID, USER_ID)).rejects.toThrow(
      "No missing audio in that collection.",
    );
  });

  it("snapshots missing term ids onto a queued job", async () => {
    const store = emptyStore({ terms: [termRow("t1"), termRow("t2")] });
    const job = await enqueueNarrationSync(makeClient(store), DOMAIN_ID, USER_ID);
    expect(job).toMatchObject({
      domainId: DOMAIN_ID,
      domainName: "Product",
      status: "queued",
      total: 2,
      cursor: 0,
    });
    expect(store.jobs[0]?.term_ids).toEqual(["t1", "t2"]);
  });
});

describe("processNarrationSyncTick", () => {
  it("increments generated_count and continues when more terms remain", async () => {
    vi.mocked(getOrGenerateNarration).mockResolvedValue({
      status: "ready",
      storagePath: "t1.mp3",
      contentHash: HASH,
    });
    const job = jobRow({
      status: "running",
      cursor: 0,
      lease_expires_at: "2099-01-01T00:00:00.000Z",
    });
    const store = emptyStore({
      jobs: [job],
      claim: [{ job_id: job.id, term_id: "term-1", cursor: 0, term_count: 2 }],
    });

    await expect(processNarrationSyncTick(makeClient(store))).resolves.toEqual({
      shouldContinue: true,
    });
    expect(job.cursor).toBe(1);
    expect(job.generated_count).toBe(1);
    expect(job.status).toBe("running");
  });

  it("counts a failed term and still continues", async () => {
    vi.mocked(getOrGenerateNarration).mockResolvedValue({ status: "unavailable" });
    const job = jobRow({ status: "running", cursor: 0 });
    const store = emptyStore({
      jobs: [job],
      claim: [{ job_id: job.id, term_id: "term-1", cursor: 0, term_count: 2 }],
    });

    await expect(processNarrationSyncTick(makeClient(store))).resolves.toEqual({
      shouldContinue: true,
    });
    expect(job.failed_count).toBe(1);
    expect(job.generated_count).toBe(0);
    expect(job.last_error).toContain("term-1");
    expect(job.status).toBe("running");
  });

  it("marks the job completed after the last term", async () => {
    vi.mocked(getOrGenerateNarration).mockResolvedValue({
      status: "ready",
      storagePath: "t2.mp3",
      contentHash: HASH,
    });
    const job = jobRow({ status: "running", cursor: 1, term_ids: ["term-1", "term-2"] });
    const store = emptyStore({
      jobs: [job],
      claim: [{ job_id: job.id, term_id: "term-2", cursor: 1, term_count: 2 }],
    });

    await expect(processNarrationSyncTick(makeClient(store))).resolves.toEqual({
      shouldContinue: false,
    });
    expect(job.cursor).toBe(2);
    expect(job.status).toBe("completed");
  });

  it("does not overwrite a cancelled job with running/completed", async () => {
    vi.mocked(getOrGenerateNarration).mockResolvedValue({
      status: "ready",
      storagePath: "t1.mp3",
      contentHash: HASH,
    });
    const job = jobRow({ status: "cancelled", cursor: 0, finished_at: "2026-09-20T00:01:00.000Z" });
    const store = emptyStore({
      jobs: [job],
      claim: [{ job_id: job.id, term_id: "term-1", cursor: 0, term_count: 2 }],
    });

    await expect(processNarrationSyncTick(makeClient(store))).resolves.toEqual({
      shouldContinue: false,
    });
    expect(job.status).toBe("cancelled");
    expect(job.cursor).toBe(1);
    expect(job.generated_count).toBe(1);
  });

  it("returns shouldContinue false when there is nothing to claim", async () => {
    const store = emptyStore();
    await expect(processNarrationSyncTick(makeClient(store))).resolves.toEqual({
      shouldContinue: false,
    });
    expect(getOrGenerateNarration).not.toHaveBeenCalled();
  });

  it("marks the job failed when generation throws", async () => {
    vi.mocked(getOrGenerateNarration).mockRejectedValue(new Error("ElevenLabs is down"));
    const job = jobRow({ status: "running", cursor: 0 });
    const store = emptyStore({
      jobs: [job],
      claim: [{ job_id: job.id, term_id: "term-1", cursor: 0, term_count: 2 }],
    });

    await expect(processNarrationSyncTick(makeClient(store))).resolves.toEqual({
      shouldContinue: false,
    });
    expect(job.status).toBe("failed");
    expect(job.last_error).toBe("ElevenLabs is down");
  });
});

describe("cancelNarrationSync", () => {
  it("marks the active job cancelled", async () => {
    const job = jobRow({ status: "running" });
    const store = emptyStore({ jobs: [job] });
    const view = await cancelNarrationSync(makeClient(store));
    expect(view?.status).toBe("cancelled");
    expect(job.status).toBe("cancelled");
  });
});

describe("canResumeNarrationSync", () => {
  it("is true only for an active job whose lease has expired", () => {
    expect(canResumeNarrationSync(null)).toBe(false);
    expect(
      canResumeNarrationSync({
        id: "job-1",
        domainId: DOMAIN_ID,
        domainName: "Product",
        status: "running",
        total: 2,
        cursor: 0,
        generatedCount: 0,
        failedCount: 0,
        lastError: null,
        leaseExpired: true,
      }),
    ).toBe(true);
    expect(
      canResumeNarrationSync({
        id: "job-1",
        domainId: DOMAIN_ID,
        domainName: "Product",
        status: "running",
        total: 2,
        cursor: 0,
        generatedCount: 0,
        failedCount: 0,
        lastError: null,
        leaseExpired: false,
      }),
    ).toBe(false);
    expect(
      canResumeNarrationSync({
        id: "job-1",
        domainId: DOMAIN_ID,
        domainName: "Product",
        status: "completed",
        total: 2,
        cursor: 2,
        generatedCount: 2,
        failedCount: 0,
        lastError: null,
        leaseExpired: true,
      }),
    ).toBe(false);
  });
});
