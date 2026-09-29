import { beforeEach, describe, expect, it, vi } from "vitest";
import { VERIFIED_USER_HEADER } from "@/lib/auth/verified-user-header";

const getNarrationAccessForUser = vi.fn();
const getCachedNarration = vi.fn();
const getOrGenerateNarration = vi.fn();
const markNarrationFileMissing = vi.fn();
const downloadNarrationAudio = vi.fn();
const termRow = vi.fn();

vi.mock("@/lib/narration/access", () => ({ getNarrationAccessForUser }));
vi.mock("@/lib/narration/service", () => ({
  getCachedNarration,
  getOrGenerateNarration,
  markNarrationFileMissing,
}));
vi.mock("@/lib/narration/storage", () => ({
  downloadNarrationAudio,
  NarrationAudioMissingError: class NarrationAudioMissingError extends Error {},
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: termRow }) }) }),
  }),
}));

const { GET, POST } = await import("./route");
const { NarrationAudioMissingError } = await import("@/lib/narration/storage");

const ctx = { params: Promise.resolve({ termId: "term-1" }) };

function request(method: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/narration/term-1", {
    method,
    headers: { [VERIFIED_USER_HEADER]: "user-1", ...headers },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getNarrationAccessForUser.mockResolvedValue(true);
  termRow.mockResolvedValue({ data: { id: "term-1" } });
  getCachedNarration.mockResolvedValue({
    status: "ready",
    storagePath: "term-1.mp3",
    contentHash: "abc",
  });
});

describe("narration route authorization", () => {
  it("rejects a request without a verified user", async () => {
    const res = await GET(new Request("http://localhost/x"), ctx);
    expect(res.status).toBe(401);
  });

  it("rejects users who are not allowlisted", async () => {
    getNarrationAccessForUser.mockResolvedValue(false);
    expect((await GET(request("GET"), ctx)).status).toBe(403);
    expect((await POST(request("POST"), ctx)).status).toBe(403);
    expect(getOrGenerateNarration).not.toHaveBeenCalled();
  });

  it("returns 404 for a term the user cannot read, on both methods", async () => {
    termRow.mockResolvedValue({ data: null });
    expect((await GET(request("GET"), ctx)).status).toBe(404);
    expect((await POST(request("POST"), ctx)).status).toBe(404);
    expect(getCachedNarration).not.toHaveBeenCalled();
    expect(getOrGenerateNarration).not.toHaveBeenCalled();
  });
});

describe("GET", () => {
  it("returns 404 for uncached audio without generating", async () => {
    getCachedNarration.mockResolvedValue({ status: "unavailable" });
    expect((await GET(request("GET"), ctx)).status).toBe(404);
    expect(getOrGenerateNarration).not.toHaveBeenCalled();
  });

  it("answers a matching ETag with 304 and keeps revalidating", async () => {
    const res = await GET(request("GET", { "if-none-match": '"abc"' }), ctx);
    expect(res.status).toBe(304);
    expect(res.headers.get("ETag")).toBe('"abc"');
    expect(res.headers.get("Cache-Control")).toBe("private, no-cache");
    expect(downloadNarrationAudio).not.toHaveBeenCalled();
  });

  it("streams a range request as 206", async () => {
    downloadNarrationAudio.mockResolvedValue({
      stream: new ReadableStream(),
      contentLength: 10,
      contentRange: "bytes 0-9/100",
      partial: true,
    });
    const res = await GET(request("GET", { range: "bytes=0-9" }), ctx);
    expect(downloadNarrationAudio).toHaveBeenCalledWith("term-1.mp3", "bytes=0-9");
    expect(res.status).toBe(206);
    expect(res.headers.get("Content-Range")).toBe("bytes 0-9/100");
  });

  it("returns 404 and marks the row failed when the file is missing", async () => {
    downloadNarrationAudio.mockRejectedValue(new NarrationAudioMissingError("gone"));
    const res = await GET(request("GET"), ctx);
    expect(res.status).toBe(404);
    expect(markNarrationFileMissing).toHaveBeenCalledWith({}, "term-1", "abc");
  });

  it("returns 502 on other storage errors without touching the row", async () => {
    downloadNarrationAudio.mockRejectedValue(new Error("s3 down"));
    expect((await GET(request("GET"), ctx)).status).toBe(502);
    expect(markNarrationFileMissing).not.toHaveBeenCalled();
  });
});

describe("POST", () => {
  it("generates and replies with JSON only", async () => {
    getOrGenerateNarration.mockResolvedValue({
      status: "ready",
      storagePath: "p",
      contentHash: "h",
    });
    const res = await POST(request("POST"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ready: true });
  });

  it("reports a failed generation", async () => {
    getOrGenerateNarration.mockResolvedValue({ status: "unavailable" });
    expect((await POST(request("POST"), ctx)).status).toBe(502);
  });
});
