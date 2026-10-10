import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import {
  DEFAULT_REVIEW_OPTIONS,
  getReviewOptions,
  isReviewOptionKey,
  saveReviewOption,
} from "./options";

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

describe("getReviewOptions", () => {
  it("falls back to the defaults when the user has no settings row", async () => {
    expect(await getReviewOptions(readClient(null), "u1")).toEqual(DEFAULT_REVIEW_OPTIONS);
  });

  it("maps the stored columns", async () => {
    const options = await getReviewOptions(
      readClient({
        review_narrate_on_reveal: true,
        review_swipe: false,
        review_keep_awake: true,
        review_show_next_review: false,
      }),
      "u2",
    );
    expect(options).toEqual({
      narrateOnReveal: true,
      swipe: false,
      keepAwake: true,
      showNextReview: false,
    });
  });
});

describe("saveReviewOption", () => {
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

    await saveReviewOption(client, "u1", "swipe", false);
    expect(calls[0]?.row).toMatchObject({ user_id: "u1", review_swipe: false });
    expect(Object.keys(calls[0]!.row).sort()).toEqual(
      ["review_swipe", "updated_at", "user_id"].sort(),
    );
    expect(calls[0]?.options).toEqual({ onConflict: "user_id" });
  });
});

describe("isReviewOptionKey", () => {
  it("accepts only known options", () => {
    expect(isReviewOptionKey("narrateOnReveal")).toBe(true);
    expect(isReviewOptionKey("review_swipe")).toBe(false);
    expect(isReviewOptionKey("toString")).toBe(false);
  });
});
