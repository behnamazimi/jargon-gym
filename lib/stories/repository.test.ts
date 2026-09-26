import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { markStoryRead } from "./repository";

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
