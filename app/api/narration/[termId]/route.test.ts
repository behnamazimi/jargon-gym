import { beforeEach, describe, expect, it, vi } from "vitest";
import { signedUserHeaders } from "@/lib/auth/signed-user-headers";

const getNarrationAccessForUser = vi.fn();
const isAdminAccount = vi.fn();
const getReadyAudio = vi.fn();
const getOrCreateAudio = vi.fn();
const loadTermSubject = vi.fn();
const serveAudio = vi.fn();
const serveJob = vi.fn();
const getReadyJobById = vi.fn();
const termRow = vi.fn();
const getFeatureSettings = vi.fn();
const countRecentGenerations = vi.fn();
const recordUsage = vi.fn();
const guard = vi.hoisted(() => ({ busy: false, inputs: [] as unknown[] }));
const SUBJECT = { type: "term", id: "term-1" };

vi.mock("@/lib/narration/access", () => ({ getNarrationAccessForUser, isAdminAccount }));
vi.mock("@/lib/ai/speech/audio", () => ({ getReadyAudio, getOrCreateAudio }));
vi.mock("@/lib/ai/speech/subjects", () => ({ loadTermSubject }));
vi.mock("@/lib/ai/speech/serve", () => ({ serveAudio, serveJob }));
vi.mock("@/lib/ai/speech/jobs", () => ({ getReadyJobById }));
vi.mock("@/lib/ai/run-guard", () => ({
  withRunGuard: async (input: unknown, run: () => Promise<unknown>) => {
    guard.inputs.push(input);
    if (guard.busy) return { busy: true };
    return { busy: false, value: await run() };
  },
}));
vi.mock("@/lib/ai/feature-settings", () => ({ getFeatureSettings }));
vi.mock("@/lib/ai/usage", () => ({ countRecentGenerations, recordUsage }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ not: () => ({ maybeSingle: termRow }) }) }) }),
  }),
}));

const { GET, POST } = await import("./route");

const ctx = { params: Promise.resolve({ termId: "term-1" }) };

const USER_HEADERS = await signedUserHeaders("user-1");

const JOB_ID = "0b4f6a52-6a06-4a0f-9c0e-3f2d5a1b7c11";

function request(method: string, headers: Record<string, string> = {}, query = "") {
  return new Request(`http://localhost/api/narration/term-1${query}`, {
    method,
    headers: { ...USER_HEADERS, ...headers },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getNarrationAccessForUser.mockResolvedValue(true);
  isAdminAccount.mockResolvedValue(false);
  termRow.mockResolvedValue({ data: { id: "term-1" } });
  loadTermSubject.mockResolvedValue(SUBJECT);
  getReadyAudio.mockResolvedValue({ id: "job-1" });
  serveAudio.mockResolvedValue(new Response("audio", { status: 200 }));
  serveJob.mockResolvedValue(new Response("audio", { status: 200 }));
  getReadyJobById.mockResolvedValue({ id: JOB_ID, storage_path: "p.mp3" });
  guard.busy = false;
  guard.inputs = [];
  getFeatureSettings.mockResolvedValue({ dailyCap: 5 });
  countRecentGenerations.mockResolvedValue(0);
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
    expect(getOrCreateAudio).not.toHaveBeenCalled();
  });

  it("lets an admin without access listen, but not have a clip made", async () => {
    getNarrationAccessForUser.mockResolvedValue(false);
    isAdminAccount.mockResolvedValue(true);
    expect((await GET(request("GET"), ctx)).status).toBe(200);
    expect((await POST(request("POST"), ctx)).status).toBe(403);
    expect(getOrCreateAudio).not.toHaveBeenCalled();
  });

  it("returns 404 for a term the user cannot read, on both methods", async () => {
    termRow.mockResolvedValue({ data: null });
    expect((await GET(request("GET"), ctx)).status).toBe(404);
    expect((await POST(request("POST"), ctx)).status).toBe(404);
    expect(loadTermSubject).not.toHaveBeenCalled();
    expect(getOrCreateAudio).not.toHaveBeenCalled();
  });
});

describe("GET", () => {
  it("hands the subject to the shared audio handler", async () => {
    const res = await GET(request("GET"), ctx);
    expect(res.status).toBe(200);
    expect(serveAudio).toHaveBeenCalledWith(expect.any(Request), {}, SUBJECT);
  });

  it("returns 404 for a term that no longer exists, without generating", async () => {
    loadTermSubject.mockResolvedValue(null);
    expect((await GET(request("GET"), ctx)).status).toBe(404);
    expect(serveAudio).not.toHaveBeenCalled();
    expect(getOrCreateAudio).not.toHaveBeenCalled();
  });
});

describe("GET with a version", () => {
  const versioned = () => request("GET", {}, `?v=${JOB_ID}`);

  it("serves that exact clip as cacheable, without loading the term or its mode", async () => {
    const res = await GET(versioned(), ctx);
    expect(res.status).toBe(200);
    expect(getReadyJobById).toHaveBeenCalledWith({}, { type: "term", id: "term-1" }, JOB_ID);
    expect(serveJob).toHaveBeenCalledWith(
      expect.any(Request),
      {},
      expect.objectContaining({ id: JOB_ID }),
      { versioned: true },
    );
    expect(loadTermSubject).not.toHaveBeenCalled();
    expect(serveAudio).not.toHaveBeenCalled();
  });

  it("still checks access and that the term is readable", async () => {
    getNarrationAccessForUser.mockResolvedValue(false);
    expect((await GET(versioned(), ctx)).status).toBe(403);
    getNarrationAccessForUser.mockResolvedValue(true);
    termRow.mockResolvedValue({ data: null });
    expect((await GET(versioned(), ctx)).status).toBe(404);
    expect(getReadyJobById).not.toHaveBeenCalled();
  });

  it("is an uncacheable 404 when the clip is gone or replaced", async () => {
    getReadyJobById.mockResolvedValue(null);
    const res = await GET(versioned(), ctx);
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(serveJob).not.toHaveBeenCalled();
  });

  it("treats a version that is not a uuid as a 404 without a lookup", async () => {
    const res = await GET(request("GET", {}, "?v=nope"), ctx);
    expect(res.status).toBe(404);
    expect(getReadyJobById).not.toHaveBeenCalled();
  });
});

describe("POST", () => {
  beforeEach(() => {
    getReadyAudio.mockResolvedValue(null);
  });

  const generated = {
    status: "ready",
    job: { id: "job-2" },
    generation: { calls: [{ provider: "murf", units: 120, outcome: "ok" }] },
  };

  it("generates and replies with JSON only", async () => {
    getOrCreateAudio.mockResolvedValue(generated);
    const res = await POST(request("POST"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ready: true, version: "job-2" });
  });

  it("serves a cached clip without counting it or checking the cap", async () => {
    getReadyAudio.mockResolvedValue({ id: "job-1" });
    const res = await POST(request("POST"), ctx);
    expect(await res.json()).toEqual({ ready: true, version: "job-1" });
    expect(getOrCreateAudio).not.toHaveBeenCalled();
    expect(countRecentGenerations).not.toHaveBeenCalled();
    expect(recordUsage).not.toHaveBeenCalled();
  });

  it("counts a generation for the person who asked for it", async () => {
    getOrCreateAudio.mockResolvedValue(generated);
    await POST(request("POST"), ctx);
    expect(recordUsage).toHaveBeenCalledWith(
      {},
      { userId: "user-1", feature: "narration_term", provider: "murf", units: 120, outcome: "ok" },
    );
  });

  it("counts a failed generation too", async () => {
    getOrCreateAudio.mockResolvedValue({
      status: "unavailable",
      generation: { calls: [{ provider: "murf", units: 90, outcome: "failed" }] },
    });
    const res = await POST(request("POST"), ctx);
    expect(res.status).toBe(502);
    expect(recordUsage).toHaveBeenCalledWith(
      {},
      {
        userId: "user-1",
        feature: "narration_term",
        provider: "murf",
        units: 90,
        outcome: "failed",
      },
    );
  });

  it("does not count a request that only waited for someone else's generation", async () => {
    getOrCreateAudio.mockResolvedValue({ status: "ready", job: {} });
    await POST(request("POST"), ctx);
    expect(recordUsage).not.toHaveBeenCalled();
  });

  it("checks this person's count for term narration, under a guard for the same feature", async () => {
    getOrCreateAudio.mockResolvedValue(generated);
    await POST(request("POST"), ctx);
    expect(getFeatureSettings).toHaveBeenCalledWith({}, "narration_term");
    expect(countRecentGenerations).toHaveBeenCalledWith({}, "user-1", "narration_term");
    expect(guard.inputs).toEqual([{ admin: {}, userId: "user-1", feature: "narration_term" }]);
  });

  it("refuses a second generation while the first is still running", async () => {
    guard.busy = true;
    const res = await POST(request("POST"), ctx);
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ ready: false, busy: true });
    expect(getOrCreateAudio).not.toHaveBeenCalled();
    expect(countRecentGenerations).not.toHaveBeenCalled();
  });

  it("refuses with 429 and generates nothing once the cap is used up", async () => {
    countRecentGenerations.mockResolvedValue(5);
    const res = await POST(request("POST"), ctx);
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ ready: false, capped: true });
    expect(getOrCreateAudio).not.toHaveBeenCalled();
  });

  it("has no limit when the cap is blank", async () => {
    getFeatureSettings.mockResolvedValue({ dailyCap: null });
    getOrCreateAudio.mockResolvedValue(generated);
    expect((await POST(request("POST"), ctx)).status).toBe(200);
    expect(countRecentGenerations).not.toHaveBeenCalled();
  });

  it("waits for another request's generation and reports it as not ready if it never finishes", async () => {
    getOrCreateAudio.mockResolvedValue({ status: "pending" });
    expect((await POST(request("POST"), ctx)).status).toBe(502);
    expect(recordUsage).not.toHaveBeenCalled();
    expect(getOrCreateAudio).toHaveBeenCalledWith({}, SUBJECT, { waitMs: 30_000 });
  });

  it("reports a failed generation", async () => {
    getOrCreateAudio.mockResolvedValue({ status: "unavailable" });
    expect((await POST(request("POST"), ctx)).status).toBe(502);
  });
});
