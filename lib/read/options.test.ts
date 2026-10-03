import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import {
  DEFAULT_READ_OPTIONS,
  getReadOptions,
  isReadOptionKey,
  isReadOptionValue,
  saveReadOption,
} from "./options";

type Client = SupabaseClient<Database>;

function readClient(row: Record<string, boolean | number> | null): Client {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: row, error: null }) }),
      }),
    }),
  } as unknown as Client;
}

describe("getReadOptions", () => {
  it("falls back to the defaults when the user has no settings row", async () => {
    expect(await getReadOptions(readClient(null), "u1")).toEqual(DEFAULT_READ_OPTIONS);
  });

  it("maps the stored columns", async () => {
    const options = await getReadOptions(
      readClient({
        read_stories_default: true,
        read_hide_question: false,
        read_revealed_default: true,
        read_narration_highlight: false,
        read_shadowing: true,
        read_shadowing_pause: false,
        read_shadowing_gap: 1.5,
        read_shadowing_repeats: 0,
      }),
      "u2",
    );
    expect(options).toEqual({
      storiesDefault: true,
      hideQuestion: false,
      revealedDefault: true,
      narrationHighlight: false,
      shadowing: true,
      shadowingPause: false,
      shadowingGap: 1.5,
      shadowingRepeats: 0,
    });
  });

  it("falls back to the default for a pause length or repeat count we don't offer", async () => {
    const options = await getReadOptions(
      readClient({
        read_stories_default: false,
        read_hide_question: true,
        read_revealed_default: false,
        read_narration_highlight: true,
        read_shadowing: true,
        read_shadowing_pause: true,
        read_shadowing_gap: 7,
        read_shadowing_repeats: 4,
      }),
      "u3",
    );
    expect(options.shadowingGap).toBe(DEFAULT_READ_OPTIONS.shadowingGap);
    expect(options.shadowingRepeats).toBe(DEFAULT_READ_OPTIONS.shadowingRepeats);
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

describe("saveReadOption with a number", () => {
  it("writes a pause length to its own column", async () => {
    const rows: Record<string, unknown>[] = [];
    const client = {
      from: () => ({
        upsert: (row: Record<string, unknown>) => {
          rows.push(row);
          return Promise.resolve({ error: null });
        },
      }),
    } as unknown as Client;

    await saveReadOption(client, "u1", "shadowingGap", 2);
    expect(rows[0]).toMatchObject({ user_id: "u1", read_shadowing_gap: 2 });
  });
});

describe("isReadOptionValue", () => {
  it("takes a switch for the yes/no options", () => {
    expect(isReadOptionValue("shadowing", true)).toBe(true);
    expect(isReadOptionValue("shadowing", 1)).toBe(false);
    expect(isReadOptionValue("hideQuestion", "true")).toBe(false);
  });

  it("takes only the offered pause lengths and repeat counts", () => {
    expect(isReadOptionValue("shadowingGap", 1.5)).toBe(true);
    expect(isReadOptionValue("shadowingGap", true)).toBe(false);
    expect(isReadOptionValue("shadowingGap", 4)).toBe(false);
    expect(isReadOptionValue("shadowingRepeats", 0)).toBe(true);
    expect(isReadOptionValue("shadowingRepeats", 4)).toBe(false);
  });
});

describe("isReadOptionKey", () => {
  it("accepts only known options", () => {
    expect(isReadOptionKey("revealedDefault")).toBe(true);
    expect(isReadOptionKey("narrationHighlight")).toBe(true);
    expect(isReadOptionKey("read_hide_question")).toBe(false);
    expect(isReadOptionKey("toString")).toBe(false);
  });
});
