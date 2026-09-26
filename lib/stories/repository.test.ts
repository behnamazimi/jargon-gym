import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { dismissUnreadStories, hasCurrentStory, markStoryRead } from "./repository";

type Client = SupabaseClient<Database>;

/** A stories table with one row, supporting the update chain markStoryRead uses. */
function makeClient(row: {
  id: string;
  user_id: string;
  read_at: string | null;
  term_ids: string[];
}) {
  return {
    from() {
      return {
        update(patch: { read_at: string }) {
          const filters: Record<string, unknown> = {};
          const chain = {
            eq(column: string, value: unknown) {
              filters[column] = value;
              return chain;
            },
            is(column: string, value: unknown) {
              filters[`${column}:is`] = value;
              return chain;
            },
            select() {
              return chain;
            },
            maybeSingle() {
              const matches =
                filters.id === row.id &&
                filters.user_id === row.user_id &&
                (filters["read_at:is"] !== null || row.read_at === null);
              if (!matches) return Promise.resolve({ data: null, error: null });
              row.read_at = patch.read_at;
              return Promise.resolve({
                data: { read_at: row.read_at, term_ids: row.term_ids },
                error: null,
              });
            },
          };
          return chain;
        },
      };
    },
  } as unknown as Client;
}

describe("markStoryRead", () => {
  it("returns the terms to credit the first time only", async () => {
    const row = { id: "s1", user_id: "u1", read_at: null, term_ids: ["t1", "t2", "t3"] };
    const client = makeClient(row);

    const first = await markStoryRead(client, "u1", "s1");
    expect(first?.termIds).toEqual(["t1", "t2", "t3"]);

    expect(await markStoryRead(client, "u1", "s1")).toBeNull();
  });

  it("ignores another user's story", async () => {
    const row = { id: "s1", user_id: "u1", read_at: null, term_ids: ["t1", "t2", "t3"] };
    expect(await markStoryRead(makeClient(row), "u2", "s1")).toBeNull();
    expect(row.read_at).toBeNull();
  });
});

type Call = [string, ...unknown[]];
const QUERY_METHODS = ["select", "update", "eq", "neq", "is", "order", "limit"] as const;

/** A query builder that records every call and resolves to `result` when
 *  awaited at any point, like the real one. */
function recordingClient(result: { data?: unknown; error: null }) {
  const calls: Call[] = [];
  function builder(): Promise<typeof result> {
    const methods = Object.fromEntries(
      QUERY_METHODS.map((method) => [
        method,
        (...args: unknown[]) => {
          calls.push([method, ...args]);
          return builder();
        },
      ]),
    );
    return Object.assign(Promise.resolve(result), methods);
  }
  const client = { from: () => builder() } as unknown as Client;
  return { client, calls };
}

describe("hasCurrentStory", () => {
  it("only counts stories that are neither read nor dismissed", async () => {
    const { client, calls } = recordingClient({ data: [{ id: "s1" }], error: null });
    expect(await hasCurrentStory(client, "u1")).toBe(true);
    expect(calls).toContainEqual(["eq", "user_id", "u1"]);
    expect(calls).toContainEqual(["is", "read_at", null]);
    expect(calls).toContainEqual(["is", "dismissed_at", null]);
  });

  it("is false when nothing matches", async () => {
    const { client } = recordingClient({ data: [], error: null });
    expect(await hasCurrentStory(client, "u1")).toBe(false);
  });
});

describe("dismissUnreadStories", () => {
  it("dismisses every other unread story when keeping the new one", async () => {
    const { client, calls } = recordingClient({ error: null });
    await dismissUnreadStories(client, "u1", { keepStoryId: "new" });
    expect(calls[0]?.[0]).toBe("update");
    expect(calls).toContainEqual(["neq", "id", "new"]);
    expect(calls).toContainEqual(["is", "read_at", null]);
    expect(calls.some(([method, column]) => method === "eq" && column === "id")).toBe(false);
  });

  it("dismisses just the one story when asked", async () => {
    const { client, calls } = recordingClient({ error: null });
    await dismissUnreadStories(client, "u1", { onlyStoryId: "s1" });
    expect(calls).toContainEqual(["eq", "id", "s1"]);
    expect(calls).toContainEqual(["eq", "user_id", "u1"]);
  });
});
