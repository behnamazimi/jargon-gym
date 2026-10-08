import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { computeContentHash } from "./content-hash";
import { computeContentHashV2, computeTermOnlyHash } from "./content-hash-v2";
import type { NarratedTermFields } from "./types";

vi.mock("next/server", () => ({
  after: (fn: () => unknown) => fn(),
}));

vi.mock("@/lib/ai/speech/audio", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/speech/audio")>()),
  getOrCreateAudio: vi.fn(),
}));
vi.mock("@/lib/ai/speech/subjects", () => ({
  loadTermSubject: vi.fn(async () => ({ id: "subject" })),
}));

const { getOrCreateAudio } = await import("@/lib/ai/speech/audio");
const {
  cancelNarrationSync,
  enqueueNarrationSync,
  getLastNarrationSyncJob,
  isCurrentAudio,
  getCollectionNarrationCoverage,
  listCollectionTermClips,
  listMissingNarrationTermIds,
  processNarrationSyncBatch,
  processNarrationSyncTick,
} = await import("./sync");
const { canResumeNarrationSync, isNarrationSyncLeaseStale } = await import("./sync-shared");

type Client = SupabaseClient<Database>;
type JobRow = Database["public"]["Tables"]["narration_sync_jobs"]["Row"];

const COLLECTION_ID = "dom-1";
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
const HASH_V2 = computeContentHashV2(FIELDS, "en");
const HASH_TERM = computeTermOnlyHash(FIELDS.term, "en");
const READY = { status: "ready", job: {} } as unknown as Awaited<
  ReturnType<typeof getOrCreateAudio>
>;

function termRow(id: string, collectionId = COLLECTION_ID) {
  return { id, collection_id: collectionId, collections: { language: "en" }, ...FIELDS };
}

function audioJob(
  termId: string,
  overrides: {
    status?: string;
    hash_version?: number;
    content_hash?: string;
    storage_path?: string | null;
  } = {},
) {
  return {
    subject_type: "term",
    subject_id: termId,
    status: "ready",
    hash_version: 2,
    content_hash: HASH_TERM,
    storage_path: `terms/${termId}.mp3`,
    ...overrides,
  };
}

function jobRow(overrides: Partial<JobRow> = {}): JobRow {
  return {
    id: "job-1",
    collection_id: COLLECTION_ID,
    started_by: USER_ID,
    status: "queued",
    term_ids: ["term-1", "term-2"],
    term_count: 2,
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
  audioJobs: ReturnType<typeof audioJob>[];
  collections: { id: string; name: string }[];
  settings: { collection_id: string; mode: string }[];
  claim: { job_id: string; term_id: string; cursor: number; term_count: number }[];
  insertErrorCode?: string;
};

function makeClient(store: Store): Client {
  function matches(row: Record<string, unknown>, filters: Record<string, unknown>) {
    return Object.entries(filters).every(([key, value]) =>
      key.startsWith("!") ? row[key.slice(1)] !== value : row[key] === value,
    );
  }

  function rowsFor(table: string) {
    if (table === "terms") return store.terms;
    if (table === "audio_jobs") return store.audioJobs;
    if (table === "collections") return store.collections;
    if (table === "narration_sync_jobs") return store.jobs;
    if (table === "collection_narration_settings") return store.settings;
    if (table === "ai_feature_settings") {
      return [{ feature: "narration_term", enabled: store.enabled }];
    }
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
        neq: (column: string, value: unknown) => {
          state.filters[`!${column}`] = value;
          return builder;
        },
        in: (column: string, values: unknown[]) => {
          state.inFilters[column] = values;
          return builder;
        },
        not: () => builder,
        order: () => builder,
        limit: (count: number) => (count <= 1 ? builder : finish("list")),
        range: () => finish("list"),
        single: () => finish("single"),
        maybeSingle: () => finish("maybe"),
        // The real query builder is awaitable after `.in()`; the fake has to be too.
        // oxlint-disable-next-line unicorn/no-thenable
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          finish("list").then(resolve, reject),
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
    audioJobs: [],
    collections: [{ id: COLLECTION_ID, name: "Product" }],
    settings: [],
    claim: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(getOrCreateAudio).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isCurrentAudio", () => {
  const term = termRow("term-1");

  it("is true only for ready audio that matches the current hash", () => {
    expect(isCurrentAudio(term, undefined, "term")).toBe(false);
    expect(isCurrentAudio(term, audioJob("term-1"), "term")).toBe(true);
    expect(
      isCurrentAudio(term, audioJob("term-1", { status: "failed", storage_path: null }), "term"),
    ).toBe(false);
    expect(
      isCurrentAudio(term, audioJob("term-1", { status: "pending", storage_path: null }), "term"),
    ).toBe(false);
    expect(isCurrentAudio(term, audioJob("term-1", { content_hash: "stale" }), "term")).toBe(false);
  });

  it("does not remake a term-only clip when a field that is not spoken changes", () => {
    expect(isCurrentAudio({ ...term, definition: "Edited." }, audioJob("term-1"), "term")).toBe(
      true,
    );
    expect(isCurrentAudio({ ...term, term: "Other" }, audioJob("term-1"), "term")).toBe(false);
  });

  it("makes a clip from the other mode stale", () => {
    const full = audioJob("term-1", { content_hash: HASH_V2 });
    expect(isCurrentAudio(term, full, "full")).toBe(true);
    expect(isCurrentAudio(term, full, "term")).toBe(false);
    expect(isCurrentAudio(term, audioJob("term-1"), "full")).toBe(false);
  });

  it("keeps a version 1 clip valid in full mode only, while its own hash matches", () => {
    const v1 = audioJob("term-1", { hash_version: 1, content_hash: HASH });
    expect(isCurrentAudio(term, v1, "full")).toBe(true);
    expect(isCurrentAudio({ ...term, definition: "Edited." }, v1, "full")).toBe(false);
    expect(isCurrentAudio(term, v1, "term")).toBe(false);
  });

  it("makes a term-only clip stale when the language changes", () => {
    expect(
      isCurrentAudio({ ...term, collections: { language: "nl" } }, audioJob("term-1"), "term"),
    ).toBe(false);
  });
});

describe("listMissingNarrationTermIds", () => {
  it("returns terms with no live job, a failed or pending one, or a stale hash", async () => {
    const store = emptyStore({
      terms: [
        termRow("t-missing"),
        termRow("t-ready"),
        termRow("t-failed"),
        termRow("t-stale"),
        termRow("t-old-version"),
        termRow("t-superseded"),
      ],
      audioJobs: [
        audioJob("t-ready"),
        audioJob("t-failed", { status: "failed", storage_path: null }),
        audioJob("t-stale", { content_hash: "old" }),
        audioJob("t-old-version", { hash_version: 1, content_hash: HASH }),
        audioJob("t-superseded", { status: "superseded" }),
      ],
    });

    await expect(listMissingNarrationTermIds(makeClient(store), COLLECTION_ID)).resolves.toEqual([
      "t-missing",
      "t-failed",
      "t-stale",
      "t-old-version",
      "t-superseded",
    ]);
  });

  it("follows the collection's mode", async () => {
    const store = emptyStore({
      terms: [termRow("t1")],
      audioJobs: [audioJob("t1", { content_hash: HASH_V2 })],
      settings: [{ collection_id: COLLECTION_ID, mode: "full" }],
    });
    await expect(listMissingNarrationTermIds(makeClient(store), COLLECTION_ID)).resolves.toEqual(
      [],
    );
  });
});

describe("getCollectionNarrationCoverage", () => {
  it("splits terms into current, stale and missing", async () => {
    const store = emptyStore({
      terms: [termRow("t-current"), termRow("t-stale"), termRow("t-missing")],
      audioJobs: [audioJob("t-current"), audioJob("t-stale", { content_hash: HASH_V2 })],
    });

    await expect(getCollectionNarrationCoverage(makeClient(store), COLLECTION_ID)).resolves.toEqual(
      {
        total: 3,
        current: 1,
        stale: 1,
        missing: 1,
      },
    );
  });
});

describe("listCollectionTermClips", () => {
  it("filters by state and reports the filtered total", async () => {
    const store = emptyStore({
      terms: [termRow("t1"), termRow("t2")],
      audioJobs: [audioJob("t1")],
    });

    await expect(
      listCollectionTermClips(makeClient(store), COLLECTION_ID, {
        page: 1,
        pageSize: 25,
        state: "missing",
      }),
    ).resolves.toEqual({ clips: [{ id: "t2", term: "Closure", state: "missing" }], total: 1 });
  });
});

describe("enqueueNarrationSync", () => {
  it("rejects when narration is turned off", async () => {
    const store = emptyStore({ enabled: false, terms: [termRow("t1")] });
    await expect(enqueueNarrationSync(makeClient(store), COLLECTION_ID, USER_ID)).rejects.toThrow(
      "Narration is turned off.",
    );
  });

  it("rejects when a job is already running", async () => {
    const store = emptyStore({
      terms: [termRow("t1")],
      jobs: [jobRow({ status: "running" })],
    });
    await expect(enqueueNarrationSync(makeClient(store), COLLECTION_ID, USER_ID)).rejects.toThrow(
      "A sync is already running.",
    );
  });

  it("rejects when every term already has current audio", async () => {
    const store = emptyStore({
      terms: [termRow("t1")],
      audioJobs: [audioJob("t1")],
    });
    await expect(enqueueNarrationSync(makeClient(store), COLLECTION_ID, USER_ID)).rejects.toThrow(
      "No missing audio in that collection.",
    );
  });

  it("snapshots missing term ids onto a queued job", async () => {
    const store = emptyStore({ terms: [termRow("t1"), termRow("t2")] });
    const job = await enqueueNarrationSync(makeClient(store), COLLECTION_ID, USER_ID);
    expect(job).toMatchObject({
      collectionId: COLLECTION_ID,
      collectionName: "Product",
      status: "queued",
      total: 2,
      cursor: 0,
    });
    expect(store.jobs[0]?.term_ids).toEqual(["t1", "t2"]);
    expect(store.jobs[0]?.term_count).toBe(2);
  });
});

describe("processNarrationSyncTick", () => {
  it("increments generated_count and continues when more terms remain", async () => {
    vi.mocked(getOrCreateAudio).mockResolvedValue(READY);
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
    vi.mocked(getOrCreateAudio).mockResolvedValue({ status: "unavailable" });
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
    vi.mocked(getOrCreateAudio).mockResolvedValue(READY);
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

  it("drops the term list of a completed job but keeps its total", async () => {
    vi.mocked(getOrCreateAudio).mockResolvedValue(READY);
    const job = jobRow({ status: "running", cursor: 1, term_ids: ["term-1", "term-2"] });
    const store = emptyStore({
      jobs: [job],
      claim: [{ job_id: job.id, term_id: "term-2", cursor: 1, term_count: 2 }],
    });

    await processNarrationSyncTick(makeClient(store));
    expect(job.term_ids).toEqual([]);
    expect(job.term_count).toBe(2);
    await expect(getLastNarrationSyncJob(makeClient(store))).resolves.toMatchObject({ total: 2 });
  });

  it("does not overwrite a cancelled job with running/completed", async () => {
    vi.mocked(getOrCreateAudio).mockResolvedValue(READY);
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
    expect(getOrCreateAudio).not.toHaveBeenCalled();
  });

  it("marks the job failed when generation throws", async () => {
    vi.mocked(getOrCreateAudio).mockRejectedValue(new Error("ElevenLabs is down"));
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

describe("switching narration off ends a running sync", () => {
  function runningJob() {
    return jobRow({
      status: "running",
      cursor: 0,
      term_ids: ["term-1", "term-2", "term-3"],
      lease_expires_at: "2099-01-01T00:00:00.000Z",
    });
  }

  it("cancels the job and generates nothing when the batch worker starts", async () => {
    vi.mocked(getOrCreateAudio).mockClear();
    const job = runningJob();
    const store = emptyStore({
      enabled: false,
      jobs: [job],
      claim: [{ job_id: job.id, term_id: "term-1", cursor: 0, term_count: 3 }],
    });

    await expect(
      processNarrationSyncBatch(makeClient(store), { budgetMs: 60_000 }),
    ).resolves.toEqual({ shouldContinue: false });
    expect(getOrCreateAudio).not.toHaveBeenCalled();
    expect(job.status).toBe("cancelled");
    expect(job.lease_expires_at).toBeNull();
    expect(job.finished_at).not.toBeNull();
  });

  it("cancels the job on a single tick as well", async () => {
    vi.mocked(getOrCreateAudio).mockClear();
    const job = runningJob();
    const store = emptyStore({
      enabled: false,
      jobs: [job],
      claim: [{ job_id: job.id, term_id: "term-1", cursor: 0, term_count: 3 }],
    });

    await expect(processNarrationSyncTick(makeClient(store))).resolves.toEqual({
      shouldContinue: false,
    });
    expect(getOrCreateAudio).not.toHaveBeenCalled();
    expect(job.status).toBe("cancelled");
  });

  it("stops between waves when it is switched off part way through", async () => {
    const job = runningJob();
    job.term_ids = ["term-1", "term-2", "term-3", "term-4", "term-5", "term-6"];
    const store = emptyStore({
      jobs: [job],
      claim: [{ job_id: job.id, term_id: "term-1", cursor: 0, term_count: 6 }],
    });
    vi.mocked(getOrCreateAudio).mockClear();
    vi.mocked(getOrCreateAudio).mockImplementation(async () => {
      store.enabled = false;
      return READY;
    });

    await processNarrationSyncBatch(makeClient(store), { budgetMs: 60_000 });
    expect(getOrCreateAudio).toHaveBeenCalledTimes(4);
    expect(job.status).toBe("cancelled");
  });
});

describe("processNarrationSyncBatch", () => {
  it("processes a parallel wave then remaining terms in one invocation", async () => {
    vi.mocked(getOrCreateAudio).mockResolvedValue(READY);
    const termIds = ["term-1", "term-2", "term-3", "term-4", "term-5"];
    const job = jobRow({
      status: "running",
      cursor: 0,
      term_ids: termIds,
      lease_expires_at: "2099-01-01T00:00:00.000Z",
    });
    const store = emptyStore({
      jobs: [job],
      claim: [{ job_id: job.id, term_id: "term-1", cursor: 0, term_count: termIds.length }],
    });

    await expect(
      processNarrationSyncBatch(makeClient(store), { budgetMs: 60_000 }),
    ).resolves.toEqual({ shouldContinue: false });
    expect(getOrCreateAudio).toHaveBeenCalledTimes(5);
    expect(job.cursor).toBe(5);
    expect(job.generated_count).toBe(5);
    expect(job.status).toBe("completed");
  });

  it("stops after the budget and leaves remaining terms for the next kick", async () => {
    vi.mocked(getOrCreateAudio).mockResolvedValue(READY);
    const termIds = ["term-1", "term-2", "term-3", "term-4", "term-5", "term-6"];
    const job = jobRow({ status: "running", cursor: 0, term_ids: termIds });
    const store = emptyStore({
      jobs: [job],
      claim: [{ job_id: job.id, term_id: "term-1", cursor: 0, term_count: termIds.length }],
    });

    await expect(processNarrationSyncBatch(makeClient(store), { budgetMs: 0 })).resolves.toEqual({
      shouldContinue: true,
    });
    expect(getOrCreateAudio).toHaveBeenCalledTimes(4);
    expect(job.cursor).toBe(4);
    expect(job.status).toBe("running");
    expect(job.lease_expires_at).toBeNull();
  });

  it("does not overwrite a cancelled job after a parallel wave", async () => {
    const job = jobRow({
      status: "running",
      cursor: 0,
      term_ids: ["term-1", "term-2", "term-3", "term-4"],
    });
    vi.mocked(getOrCreateAudio).mockImplementation(async () => {
      job.status = "cancelled";
      job.finished_at = "2026-09-20T00:01:00.000Z";
      return READY;
    });
    const store = emptyStore({
      jobs: [job],
      claim: [{ job_id: job.id, term_id: "term-1", cursor: 0, term_count: 4 }],
    });

    await expect(
      processNarrationSyncBatch(makeClient(store), { budgetMs: 60_000 }),
    ).resolves.toEqual({ shouldContinue: false });
    expect(job.status).toBe("cancelled");
    expect(job.cursor).toBe(4);
    expect(job.generated_count).toBe(4);
  });
});

describe("getLastNarrationSyncJob", () => {
  it("does not mark a live job resumable between hops", async () => {
    const view = await getLastNarrationSyncJob(
      makeClient(
        emptyStore({
          jobs: [
            jobRow({
              status: "running",
              lease_expires_at: null,
              updated_at: new Date().toISOString(),
            }),
          ],
        }),
      ),
    );
    expect(view?.leaseExpired).toBe(false);
  });

  it("marks a job resumable when the lease is in the past", async () => {
    const view = await getLastNarrationSyncJob(
      makeClient(
        emptyStore({
          jobs: [
            jobRow({
              status: "running",
              lease_expires_at: "2020-01-01T00:00:00.000Z",
              updated_at: new Date().toISOString(),
            }),
          ],
        }),
      ),
    );
    expect(view?.leaseExpired).toBe(true);
  });
});

describe("isNarrationSyncLeaseStale", () => {
  const nowMs = Date.parse("2026-09-20T00:02:00.000Z");

  it("is false while a lease is still held", () => {
    expect(
      isNarrationSyncLeaseStale({
        status: "running",
        leaseExpiresAt: "2026-09-20T00:03:00.000Z",
        updatedAt: "2026-09-20T00:00:00.000Z",
        nowMs,
      }),
    ).toBe(false);
  });

  it("is false between hops when the row was just updated", () => {
    expect(
      isNarrationSyncLeaseStale({
        status: "running",
        leaseExpiresAt: null,
        updatedAt: "2026-09-20T00:01:30.000Z",
        nowMs,
      }),
    ).toBe(false);
  });

  it("is true when there is no lease and the row is stale", () => {
    expect(
      isNarrationSyncLeaseStale({
        status: "queued",
        leaseExpiresAt: null,
        updatedAt: "2026-09-20T00:00:00.000Z",
        nowMs,
      }),
    ).toBe(true);
  });
});

describe("canResumeNarrationSync", () => {
  it("is true only for an active job whose lease has expired", () => {
    expect(canResumeNarrationSync(null)).toBe(false);
    expect(
      canResumeNarrationSync({
        id: "job-1",
        collectionId: COLLECTION_ID,
        collectionName: "Product",
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
        collectionId: COLLECTION_ID,
        collectionName: "Product",
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
        collectionId: COLLECTION_ID,
        collectionName: "Product",
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
