import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { DEFAULT_READ_OPTIONS, getReadOptions, isReadOptionKey, saveReadOption } from "./options";

type Client = SupabaseClient<Database>;

function readClient(row: Record<string, boolean> | null): Client {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: row, error: null }) }),
      }),
    }),
  } as unknown as Client;
}

describe("getReadOptions", () => {
  it("falls back to all-off when the user has no settings row", async () => {
    expect(await getReadOptions(readClient(null), "u1")).toEqual(DEFAULT_READ_OPTIONS);
  });

  it("maps the stored columns", async () => {
    const options = await getReadOptions(
      readClient({
        read_stories_default: true,
        read_hide_question: false,
        read_revealed_default: true,
      }),
      "u2",
    );
    expect(options).toEqual({ storiesDefault: true, hideQuestion: false, revealedDefault: true });
  });
});

describe("saveReadOption", () => {
  it("upserts only the matching column for the user", async () => {
    const calls: { row: Record<string, unknown>; options: unknown }[] = [];
    const client = {
      from: () => ({
        upsert: (row: Record<string, unknown>, options: unknown) => {
          calls.push({ row, options });
          return Promise.resolve({ error: null });
        },
      }),
    } as unknown as Client;

    await saveReadOption(client, "u1", "hideQuestion", true);
    expect(calls[0]?.row).toMatchObject({ user_id: "u1", read_hide_question: true });
    expect(Object.keys(calls[0]!.row).sort()).toEqual(
      ["read_hide_question", "updated_at", "user_id"].sort(),
    );
    expect(calls[0]?.options).toEqual({ onConflict: "user_id" });
  });
});

describe("isReadOptionKey", () => {
  it("accepts only known options", () => {
    expect(isReadOptionKey("revealedDefault")).toBe(true);
    expect(isReadOptionKey("read_hide_question")).toBe(false);
    expect(isReadOptionKey("toString")).toBe(false);
  });
});
