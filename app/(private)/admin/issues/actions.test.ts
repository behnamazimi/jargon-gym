import { beforeEach, describe, expect, it, vi } from "vitest";

type Response = { data?: unknown; error?: unknown };

const state = vi.hoisted(() => ({
  result: { data: null, error: null } as Response,
  updates: [] as Record<string, unknown>[],
  deletes: 0,
  audits: [] as { action: string; targetId?: string; details?: unknown }[],
  removedScreenshots: [] as string[],
  screenshotFails: false,
  revalidated: [] as string[],
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => state.revalidated.push(path),
}));

vi.mock("@/lib/issues/storage", () => ({
  deleteScreenshot: async (key: string) => {
    if (state.screenshotFails) throw new Error("S3 down");
    state.removedScreenshots.push(key);
  },
}));

function query() {
  const node: Record<string, unknown> = {};
  for (const method of ["eq", "select"]) node[method] = () => node;
  node.update = (values: Record<string, unknown>) => {
    state.updates.push(values);
    return node;
  };
  node.delete = () => {
    state.deletes += 1;
    return node;
  };
  node.maybeSingle = () => Promise.resolve(state.result);
  // A delete without .select() is awaited directly.
  // oxlint-disable-next-line unicorn/no-thenable
  node.then = (resolve: (value: Response) => unknown) =>
    Promise.resolve({ error: null }).then(resolve);
  return node;
}

vi.mock("@/lib/auth/require-session", async () => {
  const { AdminError } = await import("@/lib/admin/admin-error");
  return {
    AdminError,
    requireAdminClient: async () => ({
      user: { id: "admin-1" },
      supabase: {
        from: () => query(),
        rpc: async (
          _name: string,
          args: { p_action: string; p_target_id?: string; p_details?: unknown },
        ) => {
          state.audits.push({
            action: args.p_action,
            targetId: args.p_target_id,
            details: args.p_details,
          });
          return { error: null };
        },
      },
    }),
  };
});

const { deleteIssue, setIssueStatus } = await import("./actions");

const ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  state.result = { data: null, error: null };
  state.updates = [];
  state.deletes = 0;
  state.audits = [];
  state.removedScreenshots = [];
  state.screenshotFails = false;
  state.revalidated = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("setIssueStatus", () => {
  it("updates the status and records it", async () => {
    state.result = { data: { kind: "idea" }, error: null };
    expect(await setIssueStatus({ id: ID, status: "done" })).toEqual({ ok: true, data: undefined });
    expect(state.updates[0]).toMatchObject({ status: "done" });
    expect(state.audits).toEqual([
      { action: "app.issue_done", targetId: ID, details: { kind: "idea" } },
    ]);
    expect(state.revalidated).toEqual(["/admin", "/admin/issues", `/admin/issues/${ID}`]);
  });

  it("records a reopen", async () => {
    state.result = { data: { kind: "problem" }, error: null };
    await setIssueStatus({ id: ID, status: "new" });
    expect(state.audits[0].action).toBe("app.issue_reopened");
  });

  it("refuses unknown ids and statuses", async () => {
    expect((await setIssueStatus({ id: "nope", status: "done" })).ok).toBe(false);
    expect((await setIssueStatus({ id: ID, status: "closed" as never })).ok).toBe(false);
    expect(state.updates).toEqual([]);
  });

  it("says so when the issue is gone", async () => {
    expect(await setIssueStatus({ id: ID, status: "done" })).toEqual({
      ok: false,
      error: "That issue doesn't exist.",
    });
    expect(state.audits).toEqual([]);
  });
});

describe("deleteIssue", () => {
  it("deletes the row and its screenshot, and records it", async () => {
    state.result = { data: { kind: "problem", screenshot_path: `u/${ID}.webp` }, error: null };
    expect((await deleteIssue({ id: ID })).ok).toBe(true);
    expect(state.deletes).toBe(1);
    expect(state.removedScreenshots).toEqual([`u/${ID}.webp`]);
    expect(state.audits).toEqual([
      { action: "app.issue_deleted", targetId: ID, details: { kind: "problem" } },
    ]);
    expect(state.revalidated).toEqual(["/admin", "/admin/issues"]);
  });

  it("keeps the row when the screenshot can't be removed", async () => {
    state.result = { data: { kind: "problem", screenshot_path: `u/${ID}.webp` }, error: null };
    state.screenshotFails = true;
    const result = await deleteIssue({ id: ID });
    expect(result).toEqual({
      ok: false,
      error: "Couldn't remove the screenshot, so nothing was deleted. Try again.",
    });
    expect(state.deletes).toBe(0);
    expect(state.audits).toEqual([]);
  });

  it("skips storage when there was no screenshot", async () => {
    state.result = { data: { kind: "idea", screenshot_path: null }, error: null };
    await deleteIssue({ id: ID });
    expect(state.removedScreenshots).toEqual([]);
  });
});
