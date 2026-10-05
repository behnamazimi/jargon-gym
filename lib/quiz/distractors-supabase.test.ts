import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { supabaseDistractorSource } from "./distractors-supabase";
import { makeTerm } from "./test-support";

type Row = { id: string; term: string; definition: string | null; category: string | null };

function clientWith(related: unknown[], terms: Row[]): SupabaseClient<Database> {
  return {
    from(table: string) {
      if (table === "term_relationships") {
        return { select: () => ({ or: () => Promise.resolve({ data: related, error: null }) }) };
      }
      return {
        select: () => ({
          eq: () => ({
            not: () => ({
              not: () => ({ limit: () => Promise.resolve({ data: terms, error: null }) }),
            }),
          }),
        }),
      };
    },
  } as unknown as SupabaseClient<Database>;
}

const row = (id: string, category: string | null, definition: string | null = "d"): Row => ({
  id,
  term: `term-${id}`,
  definition,
  category,
});

describe("supabaseDistractorSource", () => {
  it("puts related terms first, then fills from the collection", async () => {
    const related = [
      {
        source_term_id: "t",
        target_term_id: "r1",
        source: row("t", null),
        target: row("r1", null),
      },
    ];
    const source = supabaseDistractorSource(clientWith(related, [row("x", null), row("y", null)]));
    const picked = await source.pick(makeTerm({ id: "t" }), 3);
    expect(picked.map((d) => d.id)).toContain("r1");
    expect(picked).toHaveLength(3);
  });

  it("skips related terms with no definition", async () => {
    const related = [
      {
        source_term_id: "t",
        target_term_id: "r1",
        source: row("t", null),
        target: row("r1", null, null),
      },
    ];
    const source = supabaseDistractorSource(clientWith(related, []));
    expect(await source.pick(makeTerm({ id: "t" }), 3)).toEqual([]);
  });

  it("prefers the term's category when asked", async () => {
    const pool = [row("a", "Verbs"), row("b", "Nouns"), row("c", "Nouns"), row("d", "Verbs")];
    const source = supabaseDistractorSource(clientWith([], pool));
    const picked = await source.pick(makeTerm({ id: "t", category: "Nouns" }), 2, {
      preferCategory: true,
    });
    expect(picked.map((d) => d.category)).toEqual(["Nouns", "Nouns"]);
  });

  it("drops candidates without a definition", async () => {
    const source = supabaseDistractorSource(clientWith([], [row("a", null, null), row("b", null)]));
    const picked = await source.pick(makeTerm({ id: "t" }), 3);
    expect(picked.map((d) => d.id)).toEqual(["b"]);
  });
});
