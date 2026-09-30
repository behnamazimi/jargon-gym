import { describe, expect, it } from "vitest";
import { listWaitlist } from "./waitlist";

type Call = { method: string; args: unknown[] };

function fakeClient(total: number, rows: unknown[] = []) {
  const calls: Call[] = [];
  const client = {
    from: () => {
      const node: Record<string, unknown> = {};
      let isCount = false;
      const record =
        (method: string) =>
        (...args: unknown[]) => {
          calls.push({ method, args });
          if (method === "select")
            isCount = Boolean((args[1] as { head?: boolean } | undefined)?.head);
          return method === "range" ? Promise.resolve({ data: rows, error: null }) : chain();
        };
      const chain = () =>
        Object.assign(
          Promise.resolve(isCount ? { count: total, error: null } : { data: rows, error: null }),
          Object.fromEntries(
            ["select", "eq", "ilike", "order", "range"].map((m) => [m, record(m)]),
          ),
        );
      Object.assign(node, Object.fromEntries(["select"].map((m) => [m, record(m)])));
      return node;
    },
  };
  return { client: client as never, calls };
}

const row = (overrides: Record<string, unknown>) => ({
  id: "r1",
  email: "a@example.test",
  status: "pending",
  created_at: "2026-09-29T10:00:00Z",
  invited_at: null,
  referral_codes: null,
  ...overrides,
});

describe("listWaitlist", () => {
  it("counts first, then reads one page in a stable order", async () => {
    const { client, calls } = fakeClient(60, [row({})]);
    const result = await listWaitlist(client, { status: "pending", q: "", page: 2 });

    expect(result.total).toBe(60);
    expect(result.page).toBe(2);
    expect(calls.find((c) => c.method === "range")?.args).toEqual([25, 49]);
    expect(calls.filter((c) => c.method === "order").map((c) => c.args[0])).toEqual([
      "created_at",
      "id",
    ]);
    expect(calls.filter((c) => c.method === "eq").map((c) => c.args)).toEqual([
      ["status", "pending"],
      ["status", "pending"],
    ]);
  });

  it("clamps a page past the end instead of asking the database for it", async () => {
    const { client, calls } = fakeClient(30);
    const result = await listWaitlist(client, { status: "all", q: "", page: 40 });
    expect(result.page).toBe(2);
    expect(calls.find((c) => c.method === "range")?.args).toEqual([25, 49]);
  });

  it("escapes the search text and adds no status filter for all", async () => {
    const { client, calls } = fakeClient(1);
    await listWaitlist(client, { status: "all", q: "a_b", page: 1 });
    expect(calls.filter((c) => c.method === "ilike").map((c) => c.args)).toEqual([
      ["email", "%a\\_b%"],
      ["email", "%a\\_b%"],
    ]);
    expect(calls.some((c) => c.method === "eq")).toBe(false);
  });

  it("shows an invite whose code was used as signed up", async () => {
    const { client } = fakeClient(2, [
      row({ id: "a", status: "invited", referral_codes: { used_at: "2026-09-01" } }),
      row({ id: "b", status: "invited", referral_codes: { used_at: null } }),
    ]);
    const { rows } = await listWaitlist(client, { status: "invited", q: "", page: 1 });
    expect(rows.map((r) => r.status)).toEqual(["signed_up", "invited"]);
  });
});
