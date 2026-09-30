import { describe, expect, it } from "vitest";
import { listMembers } from "./members";

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
  for (const method of ["eq", "ilike", "order", "range"]) {
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
  const client = { from: () => ({ select: node.select }) };
  return { client: client as never, calls };
}

describe("listMembers", () => {
  it("counts first, then reads one page, newest first with a tiebreaker", async () => {
    const { client, calls } = fakeClient(60, [
      {
        id: "u1",
        email: "a@example.test",
        role: "admin",
        created_at: "2026-01-01T00:00:00Z",
        suspended_at: null,
      },
      {
        id: "u2",
        email: "b@example.test",
        role: "member",
        created_at: "2026-01-02T00:00:00Z",
        suspended_at: "2026-02-01T00:00:00Z",
      },
    ]);
    const result = await listMembers(client, { q: "", page: 3 });

    expect(calls[0]).toMatchObject({
      method: "select",
      args: ["id", { count: "exact", head: true }],
    });
    expect(calls.find((c) => c.method === "range")?.args).toEqual([50, 74]);
    expect(calls.filter((c) => c.method === "order").map((c) => c.args[0])).toEqual([
      "created_at",
      "id",
    ]);
    expect(result).toMatchObject({ total: 60, page: 3 });
    expect(result.rows).toEqual([
      {
        id: "u1",
        email: "a@example.test",
        role: "admin",
        createdAt: "2026-01-01T00:00:00Z",
        suspended: false,
      },
      {
        id: "u2",
        email: "b@example.test",
        role: "member",
        createdAt: "2026-01-02T00:00:00Z",
        suspended: true,
      },
    ]);
  });

  it("clamps a page past the end and escapes the search", async () => {
    const { client, calls } = fakeClient(10);
    const result = await listMembers(client, { q: "a_b", page: 9 });
    expect(result.page).toBe(1);
    expect(calls.filter((c) => c.method === "ilike").map((c) => c.args)).toEqual([
      ["email", "%a\\_b%"],
      ["email", "%a\\_b%"],
    ]);
  });
});
