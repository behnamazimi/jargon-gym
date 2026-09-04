import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { computeContentHash } from "./content-hash";
import type { NarratedTermFields } from "./types";

vi.mock("./eleven-labs", () => ({
  synthesizeNarrationAudio: vi.fn(),
}));
vi.mock("./storage", () => ({
  uploadNarrationAudio: vi.fn(),
  getSignedNarrationUrl: vi.fn(),
}));

const { synthesizeNarrationAudio } = await import("./eleven-labs");
const { uploadNarrationAudio, getSignedNarrationUrl } = await import("./storage");
const { getOrGenerateNarration } = await import("./service");

type Client = SupabaseClient<Database>;

const TERM_ID = "term-1";
const FIELDS: NarratedTermFields = {
  term: "Closure",
  definition: "A function bundled with its lexical scope.",
  example: null,
  mental_model: null,
  discussion: null,
  anti_example: null,
  controversy: null,
};
const HASH = computeContentHash(FIELDS);

type NarrationRow = { status: string; content_hash: string; storage_path: string | null };

/** A fake admin client covering only the call shapes lib/narration/service.ts uses. */
function makeClient(options: {
  /** Successive results for term_narrations selects (initial check, then each poll). */
  narrationRowQueue: (NarrationRow | null)[];
  /** What claim_term_narration's RPC returns — non-empty means "we won the claim". */
  claimResult: NarrationRow[];
  updateSpy?: (patch: Record<string, unknown>) => void;
  /** The term's collection language, as returned by the domains(language) embed. */
  language?: string;
}): Client {
  const queue = [...options.narrationRowQueue];

  return {
    from(table: string) {
      if (table === "terms") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { ...FIELDS, domains: { language: options.language ?? "en" } },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === "term_narrations") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: queue.shift() ?? null }),
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: () => ({
              eq: () => {
                options.updateSpy?.(patch);
                return Promise.resolve({ data: null, error: null });
              },
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
    rpc: () => Promise.resolve({ data: options.claimResult }),
  } as unknown as Client;
}

beforeEach(() => {
  vi.mocked(synthesizeNarrationAudio).mockReset();
  vi.mocked(uploadNarrationAudio).mockReset().mockResolvedValue(undefined);
  vi.mocked(getSignedNarrationUrl)
    .mockReset()
    .mockResolvedValue("https://signed.example/audio.mp3");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getOrGenerateNarration", () => {
  it("returns a signed URL on a cache hit without calling ElevenLabs", async () => {
    const client = makeClient({
      narrationRowQueue: [{ status: "ready", content_hash: HASH, storage_path: "term-1.mp3" }],
      claimResult: [],
    });

    const result = await getOrGenerateNarration(client, TERM_ID);

    expect(result).toEqual({ status: "ready", signedUrl: "https://signed.example/audio.mp3" });
    expect(synthesizeNarrationAudio).not.toHaveBeenCalled();
    expect(getSignedNarrationUrl).toHaveBeenCalledWith("term-1.mp3");
  });

  it("generates and marks ready when it wins the claim", async () => {
    vi.mocked(synthesizeNarrationAudio).mockResolvedValue(Buffer.from("audio"));
    const updates: Record<string, unknown>[] = [];
    const client = makeClient({
      narrationRowQueue: [null], // no cached row yet
      claimResult: [{ status: "pending", content_hash: HASH, storage_path: null }],
      updateSpy: (patch) => updates.push(patch),
    });

    const result = await getOrGenerateNarration(client, TERM_ID);

    expect(result).toEqual({ status: "ready", signedUrl: "https://signed.example/audio.mp3" });
    expect(synthesizeNarrationAudio).toHaveBeenCalledTimes(1);
    expect(uploadNarrationAudio).toHaveBeenCalledWith("term-1.mp3", Buffer.from("audio"));
    expect(updates).toEqual([{ status: "ready", storage_path: "term-1.mp3" }]);
  });

  it("passes the term's collection language through to ElevenLabs", async () => {
    vi.mocked(synthesizeNarrationAudio).mockResolvedValue(Buffer.from("audio"));
    const client = makeClient({
      narrationRowQueue: [null],
      claimResult: [{ status: "pending", content_hash: HASH, storage_path: null }],
      language: "nl",
    });

    await getOrGenerateNarration(client, TERM_ID);

    expect(synthesizeNarrationAudio).toHaveBeenCalledWith(expect.any(String), "nl");
  });

  it("marks the row failed and returns unavailable when synthesis throws", async () => {
    vi.mocked(synthesizeNarrationAudio).mockRejectedValue(new Error("ElevenLabs is down"));
    const updates: Record<string, unknown>[] = [];
    const client = makeClient({
      narrationRowQueue: [null],
      claimResult: [{ status: "pending", content_hash: HASH, storage_path: null }],
      updateSpy: (patch) => updates.push(patch),
    });

    const result = await getOrGenerateNarration(client, TERM_ID);

    expect(result).toEqual({ status: "unavailable" });
    expect(uploadNarrationAudio).not.toHaveBeenCalled();
    expect(updates).toEqual([{ status: "failed" }]);
  });

  it("polls and reuses the winner's result when another request already claimed it", async () => {
    vi.useFakeTimers();
    const client = makeClient({
      narrationRowQueue: [
        null, // no cached row yet
        { status: "pending", content_hash: HASH, storage_path: null }, // first poll: still working
        { status: "ready", content_hash: HASH, storage_path: "term-1.mp3" }, // second poll: done
      ],
      claimResult: [], // someone else already claimed it
    });

    const resultPromise = getOrGenerateNarration(client, TERM_ID);
    await vi.advanceTimersByTimeAsync(750);
    await vi.advanceTimersByTimeAsync(750);
    const result = await resultPromise;

    expect(result).toEqual({ status: "ready", signedUrl: "https://signed.example/audio.mp3" });
    expect(synthesizeNarrationAudio).not.toHaveBeenCalled();
  });
});
