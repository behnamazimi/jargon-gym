import { describe, expect, it } from "vitest";
import { emailsForTargets, listAudit, recentAudit, type AuditRow } from "./audit-query";

type Call = { method: string; args: unknown[] };

function fakeClient(total: number, rows: unknown[] = []) {
  const calls: Call[] = [];
  let counting = false;
  const node: Record<string, unknown> = {};
  const settle = () =>
    Object.assign(
      Promise.resolve(counting ? { count: total, error: null } : { data: rows, error: null }),
      node,
    );
  for (const method of ["eq", "in", "order", "range", "limit"]) {
    node[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return settle();
    };
  }
  node.select = (...args: unknown[]) => {
    calls.push({ method: "select", args });
    counting = Boolean((args[1] as { head?: boolean } | undefined)?.head);
    return settle();
  };
  return { client: { from: () => ({ select: node.select }) } as never, calls };
}

const dbRow = {
  id: 7,
  created_at: "2026-09-29T10:00:00Z",
  actor_email: "admin@example.test",
  action: "publish_collection",
  target_type: "domain",
  target_id: "d1",
  details: { slug: "cooking" },
};

describe("listAudit", () => {
  it("counts first, filters both queries by action, and reads one page in a stable order", async () => {
    const { client, calls } = fakeClient(60, [dbRow]);
    const result = await listAudit(client, { action: "publish_collection", page: 2 });

    expect(calls[0]).toMatchObject({
      method: "select",
      args: ["id", { count: "exact", head: true }],
    });
    expect(calls.filter((c) => c.method === "eq").map((c) => c.args)).toEqual([
      ["action", "publish_collection"],
      ["action", "publish_collection"],
    ]);
    expect(calls.find((c) => c.method === "range")?.args).toEqual([25, 49]);
    expect(calls.filter((c) => c.method === "order").map((c) => c.args[0])).toEqual([
      "created_at",
      "id",
    ]);
    expect(result).toMatchObject({ total: 60, page: 2 });
    expect(result.rows[0]).toMatchObject({
      id: 7,
      actorEmail: "admin@example.test",
      targetId: "d1",
    });
  });

  it("adds no filter for all actions and clamps a page past the end", async () => {
    const { client, calls } = fakeClient(10);
    const result = await listAudit(client, { action: null, page: 9 });
    expect(calls.some((c) => c.method === "eq")).toBe(false);
    expect(result.page).toBe(1);
  });
});

describe("recentAudit", () => {
  it("takes the latest few", async () => {
    const { client, calls } = fakeClient(0, [dbRow]);
    expect(await recentAudit(client, 8)).toHaveLength(1);
    expect(calls.find((c) => c.method === "limit")?.args).toEqual([8]);
  });
});

describe("emailsForTargets", () => {
  const row = (overrides: Partial<AuditRow>): AuditRow => ({
    id: 1,
    createdAt: "",
    actorEmail: null,
    action: "x",
    targetType: "user",
    targetId: "u1",
    details: {},
    ...overrides,
  });

  it("looks up only the people that entries are about, once each", async () => {
    const { client, calls } = fakeClient(0, [{ id: "u1", email: "a@example.test" }]);
    const emails = await emailsForTargets(client, [
      row({}),
      row({ id: 2 }),
      row({ id: 3, targetType: "domain", targetId: "d1" }),
    ]);
    expect(calls.find((c) => c.method === "in")?.args).toEqual(["id", ["u1"]]);
    expect(emails.get("u1")).toBe("a@example.test");
  });

  it("makes no query when nothing is about a person", async () => {
    const { client, calls } = fakeClient(0);
    expect((await emailsForTargets(client, [row({ targetType: "domain" })])).size).toBe(0);
    expect(calls).toEqual([]);
  });
});
