import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

vi.mock("@/lib/narration/eleven-labs", () => ({ synthesizeNarrationAudio: vi.fn() }));
vi.mock("@/lib/narration/storage", () => ({ uploadNarrationAudio: vi.fn() }));

const { synthesizeNarrationAudio } = await import("@/lib/narration/eleven-labs");
const { uploadNarrationAudio } = await import("@/lib/narration/storage");
const { getOrGenerateStoryNarration } = await import("./narration");

type Client = SupabaseClient<Database>;

type NarrationRow = {
  narration_status: string;
  narration_path: string | null;
  narration_requested_at: string | null;
};

const STORY_ROW = {
  id: "s1",
  domain_id: "d1",
  language: "en",
  format: "email",
  tone: "neutral",
  reading_level: "plain",
  cefr_level: "B1",
  outline: null,
  title: "Title",
  segments: [{ text: "Hello " }, { text: "world", termId: "t1" }],
  term_ids: ["t1", "t2", "t3"],
  new_term_ids: [],
  vote: null,
  read_at: null,
};

/** Fakes the stories-table calls narration.ts makes. `claimWins` decides
 *  whether the conditional claim update matches a row. */
function makeClient(options: {
  row: NarrationRow | null;
  recentCount?: number;
  claimWins?: boolean;
  updates?: Record<string, unknown>[];
}): Client {
  return {
    from() {
      return {
        select(columns: string) {
          const chain = {
            eq: () => chain,
            gte: () => Promise.resolve({ count: options.recentCount ?? 0, error: null }),
            maybeSingle: () =>
              Promise.resolve({
                data: columns.includes("narration_status") ? options.row : STORY_ROW,
                error: null,
              }),
          };
          return chain;
        },
        update(patch: Record<string, unknown>) {
          options.updates?.push(patch);
          // Awaitable at any point, like a real query builder.
          type Chain = Promise<{ error: null }> & {
            eq: () => Chain;
            or: () => Chain;
            select: () => Promise<{ data: { id: string }[]; error: null }>;
          };
          const chain: Chain = Object.assign(Promise.resolve({ error: null as null }), {
            eq: () => chain,
            or: () => chain,
            select: () =>
              Promise.resolve({ data: options.claimWins ? [{ id: "s1" }] : [], error: null }),
          });
          return chain;
        },
      };
    },
  } as unknown as Client;
}

const NONE: NarrationRow = {
  narration_status: "none",
  narration_path: null,
  narration_requested_at: null,
};

beforeEach(() => {
  vi.mocked(synthesizeNarrationAudio).mockReset();
  vi.mocked(uploadNarrationAudio).mockReset();
});

describe("getOrGenerateStoryNarration", () => {
  it("returns cached audio without synthesizing", async () => {
    const client = makeClient({
      row: { narration_status: "ready", narration_path: "p.mp3", narration_requested_at: null },
    });
    expect(await getOrGenerateStoryNarration(client, "u1", "s1")).toEqual({
      status: "ready",
      storagePath: "p.mp3",
    });
    expect(synthesizeNarrationAudio).not.toHaveBeenCalled();
  });

  it("reports pending while a recent generation is running", async () => {
    const client = makeClient({
      row: {
        narration_status: "pending",
        narration_path: null,
        narration_requested_at: new Date().toISOString(),
      },
    });
    expect(await getOrGenerateStoryNarration(client, "u1", "s1")).toEqual({ status: "pending" });
  });

  it("stops at the daily cap", async () => {
    const client = makeClient({ row: NONE, recentCount: 20, claimWins: true });
    expect(await getOrGenerateStoryNarration(client, "u1", "s1")).toEqual({ status: "capped" });
    expect(synthesizeNarrationAudio).not.toHaveBeenCalled();
  });

  it("leaves generation to whoever won the claim", async () => {
    const client = makeClient({ row: NONE, claimWins: false });
    expect(await getOrGenerateStoryNarration(client, "u1", "s1")).toEqual({ status: "pending" });
    expect(synthesizeNarrationAudio).not.toHaveBeenCalled();
  });

  it("synthesizes, uploads, and marks ready when it wins the claim", async () => {
    vi.mocked(synthesizeNarrationAudio).mockResolvedValue(Buffer.from("mp3"));
    const updates: Record<string, unknown>[] = [];
    const client = makeClient({ row: NONE, claimWins: true, updates });

    const result = await getOrGenerateStoryNarration(client, "u1", "s1");
    expect(result).toEqual({ status: "ready", storagePath: "stories/u1/s1.mp3" });
    expect(synthesizeNarrationAudio).toHaveBeenCalledWith("Title\n\nHello world", "en");
    expect(uploadNarrationAudio).toHaveBeenCalledWith("stories/u1/s1.mp3", expect.any(Buffer));
    expect(updates.at(-1)).toEqual({
      narration_status: "ready",
      narration_path: "stories/u1/s1.mp3",
    });
  });

  it("marks failed when synthesis throws", async () => {
    vi.mocked(synthesizeNarrationAudio).mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const updates: Record<string, unknown>[] = [];
    const client = makeClient({ row: NONE, claimWins: true, updates });

    expect(await getOrGenerateStoryNarration(client, "u1", "s1")).toEqual({
      status: "unavailable",
    });
    expect(updates.at(-1)).toEqual({ narration_status: "failed" });
  });
});
