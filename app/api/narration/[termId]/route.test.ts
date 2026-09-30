import { beforeEach, describe, expect, it, vi } from "vitest";
import { VERIFIED_USER_HEADER } from "@/lib/auth/verified-user-header";

const getNarrationAccessForUser = vi.fn();
const getReadyAudio = vi.fn();
const getOrCreateAudio = vi.fn();
const loadTermSubject = vi.fn();
const serveAudio = vi.fn();
const termRow = vi.fn();
const getFeatureSettings = vi.fn();
const countRecentGenerations = vi.fn();
const recordUsage = vi.fn();
const guard = vi.hoisted(() => ({ busy: false, inputs: [] as unknown[] }));
const SUBJECT = { type: "term", id: "term-1" };

vi.mock("@/lib/narration/access", () => ({ getNarrationAccessForUser }));
vi.mock("@/lib/ai/speech/audio", () => ({ getReadyAudio, getOrCreateAudio }));
vi.mock("@/lib/ai/speech/subjects", () => ({ loadTermSubject }));
vi.mock("@/lib/ai/speech/serve", () => ({ serveAudio }));
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
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: termRow }) }) }),
  }),
}));

const { GET, POST } = await import("./route");

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
  loadTermSubject.mockResolvedValue(SUBJECT);
  getReadyAudio.mockResolvedValue({ id: "job-1" });
  serveAudio.mockResolvedValue(new Response("audio", { status: 200 }));
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

describe("POST", () => {
  beforeEach(() => {
    getReadyAudio.mockResolvedValue(null);
  });

  const generated = {
    status: "ready",
    job: {},
    generation: { calls: [{ provider: "murf", units: 120, outcome: "ok" }] },
  };

  it("generates and replies with JSON only", async () => {
    getOrCreateAudio.mockResolvedValue(generated);
    const res = await POST(request("POST"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ready: true });
  });

  it("serves a cached clip without counting it or checking the cap", async () => {
    getReadyAudio.mockResolvedValue({ id: "job-1" });
    const res = await POST(request("POST"), ctx);
    expect(await res.json()).toEqual({ ready: true });
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
