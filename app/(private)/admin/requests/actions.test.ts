import { beforeEach, describe, expect, it, vi } from "vitest";

type Response = { data?: unknown; error?: unknown };

const state = vi.hoisted(() => ({
  /** What each table returns, one entry per awaited query, in order. */
  queue: {} as Record<string, Response[]>,
  updates: [] as { table: string; values: Record<string, unknown> }[],
  audits: [] as { action: string; details?: unknown }[],
  rpcResult: { data: null, error: null } as Response,
  notified: [] as { id: string; kind: string }[],
  notifyResult: "sent" as "sent" | "failed" | "skipped",
  revalidated: [] as string[],
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => state.revalidated.push(path),
}));

vi.mock("@/lib/admin/requests/notify", () => ({
  notifyRequester: async (_client: unknown, id: string, kind: string) => {
    state.notified.push({ id, kind });
    return state.notifyResult;
  },
}));

function next(table: string): Response {
  return state.queue[table]?.shift() ?? { data: [], error: null };
}

function query(table: string) {
  const node: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "is", "lt", "order"]) node[method] = () => node;
  node.update = (values: Record<string, unknown>) => {
    state.updates.push({ table, values });
    return node;
  };
  node.single = () => Promise.resolve(next(table));
  node.maybeSingle = () => Promise.resolve(next(table));
  node.then = (resolve: (value: Response) => unknown) => Promise.resolve(next(table)).then(resolve);
  return node;
}

vi.mock("@/lib/auth/require-session", async () => {
  const { AdminError } = await import("@/lib/admin/admin-error");
  return {
    AdminError,
    requireAdminClient: async () => ({
      user: { id: "admin-1" },
      supabase: {
        from: (table: string) => query(table),
        rpc: async (name: string, args: { p_action?: string; p_details?: unknown }) => {
          if (name === "admin_write_audit") {
            state.audits.push({ action: args.p_action ?? "", details: args.p_details });
            return { error: null };
          }
          return state.rpcResult;
        },
      },
    }),
  };
});

const { acceptRequest, askRequest, declineRequest, mergeRequest, setNewDate } =
  await import("./actions");
const { deliverRequest, addExistingCollection, resendRequestEmail, saveRequestSettings } =
  await import("./delivery-actions");

const ID = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const CHILD = "33333333-3333-4333-8333-333333333333";
const DOMAIN = "44444444-4444-4444-8444-444444444444";

beforeEach(() => {
  state.queue = {};
  state.updates = [];
  state.audits = [];
  state.rpcResult = { data: null, error: null };
  state.notified = [];
  state.notifyResult = "sent";
  state.revalidated = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

const claimed = { data: [{ id: ID }], error: null };
const lost = { data: [], error: null };

describe("acceptRequest", () => {
  it("accepts and audits", async () => {
    state.queue.collection_requests = [claimed];
    expect(await acceptRequest(ID)).toEqual({ ok: true, data: undefined });
    expect(state.updates[0]?.values).toMatchObject({ status: "in_progress", replied_at: null });
    expect(state.audits.map((a) => a.action)).toEqual(["app.request_accept"]);
    expect(state.revalidated).toContain("/admin/requests");
  });

  it("says so when someone else got there first", async () => {
    state.queue.collection_requests = [lost];
    expect(await acceptRequest(ID)).toEqual({ ok: false, error: "Request already handled." });
    expect(state.audits).toEqual([]);
  });

  it("rejects an id that isn't one", async () => {
    expect((await acceptRequest("nope")).ok).toBe(false);
  });
});

describe("askRequest", () => {
  it("asks, emails and audits", async () => {
    state.queue.collection_requests = [claimed];
    expect(await askRequest(ID, "  Which level?  ")).toEqual({
      ok: true,
      data: { emailSent: true },
    });
    expect(state.updates[0]?.values).toMatchObject({
      status: "needs_input",
      question: "Which level?",
      user_reply: null,
    });
    expect(state.notified).toEqual([{ id: ID, kind: "needs_input" }]);
  });

  it("keeps the change when the email fails", async () => {
    state.queue.collection_requests = [claimed];
    state.notifyResult = "failed";
    expect(await askRequest(ID, "Which level?")).toEqual({ ok: true, data: { emailSent: false } });
    expect(state.audits[0]?.details).toEqual({ emailSent: false });
  });

  it.each(["", "   ", "x".repeat(501)])("refuses the question %j", async (question) => {
    expect((await askRequest(ID, question)).ok).toBe(false);
    expect(state.updates).toEqual([]);
  });
});

describe("declineRequest", () => {
  it("declines the request and the ones merged into it, one email each", async () => {
    state.queue.collection_requests = [{ data: [{ id: CHILD }], error: null }, claimed, lost];
    const result = await declineRequest(ID, "too_broad", "Try one area.");
    expect(result).toEqual({ ok: true, data: { declined: 2, emailSent: true } });
    expect(state.updates.map((u) => u.values.status)).toEqual(["declined", "declined"]);
    expect(state.updates[0]?.values).toMatchObject({ decline_note: "Try one area." });
    expect(state.notified.map((n) => n.id)).toEqual([ID, CHILD]);
    expect(state.audits[0]?.details).toMatchObject({ reason: "too_broad", merged: 1 });
  });

  it("refuses an unknown reason", async () => {
    expect((await declineRequest(ID, "because")).ok).toBe(false);
  });

  it("says so when it was already handled", async () => {
    state.queue.collection_requests = [{ data: [], error: null }, lost];
    expect(await declineRequest(ID, "too_niche")).toEqual({
      ok: false,
      error: "Request already handled.",
    });
    expect(state.notified).toEqual([]);
  });
});

describe("mergeRequest", () => {
  const row = (id: string, patch: Record<string, unknown> = {}) => ({
    id,
    kind: "jargon",
    language: "en",
    status: "requested",
    ...patch,
  });

  it("merges into an open request", async () => {
    state.queue.collection_requests = [
      { data: [row(ID), row(OTHER)], error: null },
      claimed,
      { data: [], error: null },
    ];
    expect((await mergeRequest(ID, OTHER)).ok).toBe(true);
    expect(state.updates[0]?.values).toMatchObject({ status: "merged", merged_into: OTHER });
    expect(state.updates[1]?.values).toEqual({ merged_into: OTHER });
  });

  const refused: [string, Response, string][] = [
    ["itself", { data: [] }, "A request can't be merged into itself."],
    [
      "a different language",
      { data: [row(ID), row(OTHER, { language: "nl" })] },
      "Those two requests are for a different kind or language.",
    ],
    [
      "a different kind",
      { data: [row(ID), row(OTHER, { kind: "vocabulary" })] },
      "Those two requests are for a different kind or language.",
    ],
    [
      "a closed target",
      { data: [row(ID), row(OTHER, { status: "ready" })] },
      "The other request isn't open any more.",
    ],
    [
      "a source that is already handled",
      { data: [row(ID, { status: "ready" }), row(OTHER)] },
      "Request already handled.",
    ],
  ];

  it.each(refused)("refuses %s", async (name, response, message) => {
    state.queue.collection_requests = [{ ...response, error: null }];
    const result = await mergeRequest(ID, name === "itself" ? ID : OTHER);
    expect(result).toEqual({ ok: false, error: message });
    expect(state.updates).toEqual([]);
  });
});

describe("setNewDate", () => {
  const future = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);

  it("sets the date, emails once and audits", async () => {
    state.queue.collection_requests = [{ data: [], error: null }, claimed];
    expect(await setNewDate(ID, future)).toEqual({ ok: true, data: { emailSent: true } });
    expect(state.updates[0]?.values).toMatchObject({ due_at: `${future}T12:00:00.000Z` });
    expect(state.notified).toEqual([{ id: ID, kind: "delay" }]);
  });

  it("sends the notice to merged requesters too", async () => {
    state.queue.collection_requests = [{ data: [{ id: CHILD }], error: null }, claimed, lost];
    await setNewDate(ID, future);
    expect(state.notified.map((n) => n.id)).toEqual([ID, CHILD]);
  });

  it("only ever sends one", async () => {
    state.queue.collection_requests = [{ data: [], error: null }, lost];
    expect(await setNewDate(ID, future)).toEqual({
      ok: false,
      error: "A delay notice was already sent.",
    });
    expect(state.notified).toEqual([]);
  });

  it.each(["2020-01-01", "not a date", "2026-13-45", ""])("refuses %j", async (date) => {
    expect(await setNewDate(ID, date)).toEqual({ ok: false, error: "Pick a date in the future." });
  });
});

describe("deliverRequest", () => {
  const input = {
    requestId: ID,
    name: "Kubernetes",
    terms: [{ term: "Pod", definition: "Smallest unit" }],
    links: [],
    format: "lines",
  };

  it("delivers and emails each requester", async () => {
    state.rpcResult = { data: [{ request_id: ID }, { request_id: CHILD }], error: null };
    expect(await deliverRequest(input)).toEqual({
      ok: true,
      data: { delivered: 2, emailFailed: 0 },
    });
    expect(state.notified).toEqual([
      { id: ID, kind: "ready" },
      { id: CHILD, kind: "ready" },
    ]);
  });

  it("counts failed emails without undoing the delivery", async () => {
    state.rpcResult = { data: [{ request_id: ID }], error: null };
    state.notifyResult = "failed";
    expect(await deliverRequest(input)).toEqual({
      ok: true,
      data: { delivered: 1, emailFailed: 1 },
    });
  });

  it("shows the database's readable message and sends nothing", async () => {
    state.rpcResult = {
      data: null,
      error: { code: "AD001", message: "They cancelled this request." },
    };
    expect(await deliverRequest(input)).toEqual({
      ok: false,
      error: "They cancelled this request.",
    });
    expect(state.notified).toEqual([]);
  });

  it("hides any other database error", async () => {
    state.rpcResult = { data: null, error: { code: "XX000", message: "secret detail" } };
    expect(await deliverRequest(input)).toEqual({
      ok: false,
      error: "Something went wrong. Try again.",
    });
  });

  it.each([
    ["no terms", { ...input, terms: [] }],
    ["no name", { ...input, name: " " }],
    ["a bad id", { ...input, requestId: "x" }],
  ])("refuses %s", async (_name, bad) => {
    expect((await deliverRequest(bad)).ok).toBe(false);
  });
});

describe("addExistingCollection", () => {
  it("adds the collection for the requester", async () => {
    state.rpcResult = { data: [{ request_id: ID }], error: null };
    expect(await addExistingCollection(ID, DOMAIN)).toEqual({
      ok: true,
      data: { delivered: 1, emailFailed: 0 },
    });
  });
});

describe("resendRequestEmail", () => {
  const status = (value: string, delay: string | null = null) => ({
    data: { status: value, delay_notified_at: delay },
    error: null,
  });

  it.each([
    ["ready", "ready"],
    ["needs_input", "needs_input"],
    ["declined", "declined"],
  ])("resends for %s", async (current, kind) => {
    state.queue.collection_requests = [status(current)];
    expect((await resendRequestEmail(ID)).ok).toBe(true);
    expect(state.notified).toEqual([{ id: ID, kind }]);
  });

  it("resends the delay notice while waiting", async () => {
    state.queue.collection_requests = [status("in_progress", "2026-10-02T00:00:00Z")];
    await resendRequestEmail(ID);
    expect(state.notified[0]?.kind).toBe("delay");
  });

  it("has nothing to resend for a request with no email yet", async () => {
    state.queue.collection_requests = [status("requested")];
    expect((await resendRequestEmail(ID)).ok).toBe(false);
  });

  it("reports a failed send and an email turned off", async () => {
    state.queue.collection_requests = [status("ready")];
    state.notifyResult = "failed";
    expect(await resendRequestEmail(ID)).toEqual({
      ok: false,
      error: "Couldn't send the email. Try again.",
    });
    state.queue.collection_requests = [status("ready")];
    state.notifyResult = "skipped";
    expect((await resendRequestEmail(ID)).ok).toBe(false);
  });
});

describe("saveRequestSettings", () => {
  it("saves and audits", async () => {
    const input = { enabled: true, paused: false, estimateDays: 2, pausedEstimateDays: 7 };
    expect((await saveRequestSettings(input)).ok).toBe(true);
    expect(state.updates[0]?.values).toEqual({
      enabled: true,
      paused: false,
      estimate_days: 2,
      paused_estimate_days: 7,
    });
    expect(state.audits[0]?.action).toBe("app.request_settings");
  });

  it.each([
    { enabled: true, paused: false, estimateDays: 0, pausedEstimateDays: 7 },
    { enabled: true, paused: false, estimateDays: 31, pausedEstimateDays: 7 },
    { enabled: true, paused: false, estimateDays: 2, pausedEstimateDays: 61 },
    { enabled: true, paused: false, estimateDays: 1.5, pausedEstimateDays: 7 },
  ])("refuses %j", async (input) => {
    expect((await saveRequestSettings(input)).ok).toBe(false);
  });
});
