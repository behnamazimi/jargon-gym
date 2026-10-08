import { beforeEach, describe, expect, it, vi } from "vitest";
import { signedUserHeaders } from "@/lib/auth/signed-user-headers";

const getNarrationAccessForUser = vi.fn();
const loadStorySubject = vi.fn();
const getOrCreateAudio = vi.fn();
const serveAudio = vi.fn();
const serveJob = vi.fn();
const getReadyJobById = vi.fn();
const storyWithinDailyCap = vi.fn();
const recordUsage = vi.fn();
const chargeStoryNarration = vi.fn();
const GATE = () => Promise.resolve({ allowed: true });
const STORY_ID = "0b4f6a52-6a06-4a0f-9c0e-3f2d5a1b7c11";
const SUBJECT = { type: "story", id: STORY_ID };
const JOB_ID = "1c5a7b63-7b17-4b1a-8d1f-4e3e6b2c8d22";

vi.mock("@/lib/narration/access", () => ({ getNarrationAccessForUser }));
vi.mock("@/lib/ai/speech/subjects", () => ({ loadStorySubject }));
vi.mock("@/lib/ai/speech/audio", () => ({ getOrCreateAudio }));
vi.mock("@/lib/ai/speech/serve", () => ({ serveAudio, serveJob }));
vi.mock("@/lib/ai/speech/jobs", () => ({ getReadyJobById }));
vi.mock("@/lib/ai/speech/story-cap", () => ({ storyWithinDailyCap }));
vi.mock("@/lib/ai/usage", () => ({ recordUsage }));
vi.mock("@/lib/stories/narration-billing", () => ({ chargeStoryNarration }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

const { GET, POST } = await import("./route");

const ctx = { params: Promise.resolve({ storyId: STORY_ID }) };

const USER_HEADERS = await signedUserHeaders("user-1");

function request(method: string, query = "") {
  return new Request(`http://localhost/api/stories/${STORY_ID}/narration${query}`, {
    method,
    headers: { ...USER_HEADERS },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getNarrationAccessForUser.mockResolvedValue(true);
  loadStorySubject.mockResolvedValue(SUBJECT);
  serveAudio.mockResolvedValue(new Response("audio", { status: 200 }));
  serveJob.mockResolvedValue(new Response("audio", { status: 200 }));
  getReadyJobById.mockResolvedValue({ id: JOB_ID, user_id: "user-1", storage_path: "p.mp3" });
  storyWithinDailyCap.mockResolvedValue(true);
  chargeStoryNarration.mockReturnValue(GATE);
});

describe("story narration authorization", () => {
  it("rejects a request without a verified user", async () => {
    expect((await GET(new Request("http://localhost/x"), ctx)).status).toBe(401);
  });

  it("rejects a malformed story id", async () => {
    const bad = { params: Promise.resolve({ storyId: "nope" }) };
    expect((await GET(request("GET"), bad)).status).toBe(404);
    expect((await POST(request("POST"), bad)).status).toBe(404);
  });

  it("rejects users without narration access", async () => {
    getNarrationAccessForUser.mockResolvedValue(false);
    expect((await GET(request("GET"), ctx)).status).toBe(403);
    expect((await POST(request("POST"), ctx)).status).toBe(403);
    expect(getNarrationAccessForUser).toHaveBeenCalledWith({}, "user-1", "narration_story");
  });

  it("answers 404, never 304 or audio, for a story the person does not own", async () => {
    loadStorySubject.mockResolvedValue(null);
    expect((await GET(request("GET"), ctx)).status).toBe(404);
    expect((await POST(request("POST"), ctx)).status).toBe(404);
    expect(loadStorySubject).toHaveBeenCalledWith({}, "user-1", STORY_ID);
    expect(serveAudio).not.toHaveBeenCalled();
    expect(getOrCreateAudio).not.toHaveBeenCalled();
  });
});

describe("GET", () => {
  it("serves through the shared handler and never generates", async () => {
    expect((await GET(request("GET"), ctx)).status).toBe(200);
    expect(serveAudio).toHaveBeenCalledWith(expect.any(Request), {}, SUBJECT);
    expect(getOrCreateAudio).not.toHaveBeenCalled();
  });
});

describe("GET with a version", () => {
  const versioned = () => request("GET", `?v=${JOB_ID}`);

  it("serves that exact clip as cacheable", async () => {
    expect((await GET(versioned(), ctx)).status).toBe(200);
    expect(getReadyJobById).toHaveBeenCalledWith({}, SUBJECT, JOB_ID);
    expect(serveJob).toHaveBeenCalledWith(
      expect.any(Request),
      {},
      expect.objectContaining({ id: JOB_ID }),
      { versioned: true },
    );
  });

  it("never serves another person's clip", async () => {
    getReadyJobById.mockResolvedValue({ id: JOB_ID, user_id: "someone-else", storage_path: "p" });
    const res = await GET(versioned(), ctx);
    expect(res.status).toBe(404);
    expect(serveJob).not.toHaveBeenCalled();
  });

  it("is an uncacheable 404 for a clip that is gone", async () => {
    getReadyJobById.mockResolvedValue(null);
    const res = await GET(versioned(), ctx);
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("POST billing", () => {
  it("hands the charge to the audio code so only the request that starts a clip pays", async () => {
    getOrCreateAudio.mockResolvedValue({ status: "ready", job: {} });
    await POST(request("POST"), ctx);
    expect(chargeStoryNarration).toHaveBeenCalledWith({}, "user-1");
    expect(getOrCreateAudio).toHaveBeenCalledWith(
      {},
      SUBJECT,
      expect.objectContaining({ beforeGenerate: GATE }),
    );
  });

  it("answers 402 when there are not enough credits", async () => {
    getOrCreateAudio.mockResolvedValue({ status: "insufficient" });
    const res = await POST(request("POST"), ctx);
    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({ ready: false, insufficient: true });
    expect(recordUsage).not.toHaveBeenCalled();
  });
});

describe("POST", () => {
  it("prepares the audio, counts the generation and replies with JSON", async () => {
    getOrCreateAudio.mockResolvedValue({
      status: "ready",
      job: {},
      generation: { calls: [{ provider: "murf", units: 300, outcome: "ok" }] },
    });
    const res = await POST(request("POST"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ready: true });
    expect(recordUsage).toHaveBeenCalledWith(
      {},
      { userId: "user-1", feature: "narration_story", provider: "murf", units: 300, outcome: "ok" },
    );
  });

  it("does not count audio that already existed", async () => {
    getOrCreateAudio.mockResolvedValue({ status: "ready", job: {} });
    await POST(request("POST"), ctx);
    expect(recordUsage).not.toHaveBeenCalled();
  });

  it("counts a failed generation and answers 502", async () => {
    getOrCreateAudio.mockResolvedValue({
      status: "unavailable",
      generation: { calls: [{ provider: "murf", units: 80, outcome: "failed" }] },
    });
    expect((await POST(request("POST"), ctx)).status).toBe(502);
    expect(recordUsage).toHaveBeenCalledWith(
      {},
      {
        userId: "user-1",
        feature: "narration_story",
        provider: "murf",
        units: 80,
        outcome: "failed",
      },
    );
  });

  it("answers 202 while another request is still making it", async () => {
    getOrCreateAudio.mockResolvedValue({ status: "pending" });
    const res = await POST(request("POST"), ctx);
    expect(res.status).toBe(202);
    expect(recordUsage).not.toHaveBeenCalled();
  });

  it("answers 429 once the daily cap is used up", async () => {
    getOrCreateAudio.mockResolvedValue({ status: "capped" });
    const res = await POST(request("POST"), ctx);
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ ready: false, capped: true });
  });

  it("asks the cap only when a new clip would be made", async () => {
    getOrCreateAudio.mockImplementation(async (_admin, _subject, options) => {
      await options.allowGeneration();
      return { status: "pending" };
    });
    await POST(request("POST"), ctx);
    expect(storyWithinDailyCap).toHaveBeenCalledWith({}, "user-1");
  });
});
