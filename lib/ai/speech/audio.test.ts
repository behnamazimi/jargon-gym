import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioJob, SpeechSubject } from "./types";

const jobs = vi.hoisted(() => ({
  getLiveJob: vi.fn(),
  claimJob: vi.fn(),
  objectPathFor: vi.fn(),
  setJobPath: vi.fn(),
  markReady: vi.fn(),
  markFailed: vi.fn(),
}));
const synthesizeSpeech = vi.fn();
const uploadAudio = vi.fn();
const deleteAudio = vi.fn();

vi.mock("./jobs", () => jobs);
vi.mock("./provider", () => ({ synthesizeSpeech }));
vi.mock("./storage", () => ({ uploadAudio, deleteAudio }));

const { getOrCreateAudio, getReadyAudio, isCurrentJob } = await import("./audio");

const admin = {} as never;
const PATH = "audio/term/t1/2/h2/job-2.mp3";

function job(overrides: Partial<AudioJob> = {}): AudioJob {
  return {
    id: "job-1",
    subject_type: "term",
    subject_id: "t1",
    user_id: null,
    content_hash: "h2",
    hash_version: 2,
    status: "ready",
    attempts: 1,
    error: null,
    storage_path: "audio/term/t1/2/h2/job-1.mp3",
    requested_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function subject(overrides: Partial<SpeechSubject> = {}): SpeechSubject {
  return {
    type: "term",
    id: "t1",
    userId: null,
    contentHash: "h2",
    legacyHash: "h1",
    loadScript: vi.fn(async () => ({ script: "Closure. A function.", language: "en" as const })),
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  jobs.objectPathFor.mockResolvedValue(PATH);
  jobs.setJobPath.mockResolvedValue(true);
  jobs.markReady.mockResolvedValue(true);
  synthesizeSpeech.mockResolvedValue(Buffer.from("mp3"));
  uploadAudio.mockResolvedValue(undefined);
  deleteAudio.mockResolvedValue(undefined);
});

describe("isCurrentJob", () => {
  it("accepts a ready version 2 clip with the current hash", () => {
    expect(isCurrentJob(job(), subject())).toBe(true);
  });

  it("keeps a ready version 1 clip while its hash matches the old formula", () => {
    const v1 = job({ hash_version: 1, content_hash: "h1", storage_path: "t1.mp3" });
    expect(isCurrentJob(v1, subject())).toBe(true);
    expect(isCurrentJob(v1, subject({ legacyHash: "changed" }))).toBe(false);
  });

  it("rejects clips that are not ready, have no file, or carry the wrong hash", () => {
    expect(isCurrentJob(job({ status: "pending" }), subject())).toBe(false);
    expect(isCurrentJob(job({ storage_path: null }), subject())).toBe(false);
    expect(isCurrentJob(job({ content_hash: "h1" }), subject())).toBe(false);
    expect(isCurrentJob(job({ hash_version: 3 }), subject())).toBe(false);
  });
});

describe("getReadyAudio", () => {
  it("returns the current clip and never claims", async () => {
    jobs.getLiveJob.mockResolvedValue(job());
    expect(await getReadyAudio(admin, subject())).toMatchObject({ id: "job-1" });
    expect(jobs.claimJob).not.toHaveBeenCalled();
  });

  it("returns nothing for an outdated clip", async () => {
    jobs.getLiveJob.mockResolvedValue(job({ content_hash: "old" }));
    expect(await getReadyAudio(admin, subject())).toBeNull();
  });

  it("does not hand one person's story clip to another", async () => {
    const story = subject({ type: "story", userId: "u1" });
    jobs.getLiveJob.mockResolvedValue(job({ subject_type: "story", user_id: "u2" }));
    expect(await getReadyAudio(admin, story)).toBeNull();
  });
});

describe("getOrCreateAudio", () => {
  it("serves a current clip without claiming or asking the cap", async () => {
    jobs.getLiveJob.mockResolvedValue(job());
    const allowGeneration = vi.fn();
    const result = await getOrCreateAudio(admin, subject(), { allowGeneration });
    expect(result).toMatchObject({ status: "ready" });
    expect(jobs.claimJob).not.toHaveBeenCalled();
    expect(allowGeneration).not.toHaveBeenCalled();
  });

  it("keeps a version 1 clip that still matches instead of remaking it", async () => {
    jobs.getLiveJob.mockResolvedValue(
      job({ hash_version: 1, content_hash: "h1", storage_path: "t1.mp3" }),
    );
    expect(await getOrCreateAudio(admin, subject())).toMatchObject({ status: "ready" });
    expect(jobs.claimJob).not.toHaveBeenCalled();
  });

  it("remakes a version 1 clip whose fields changed, as version 2", async () => {
    jobs.getLiveJob.mockResolvedValue(
      job({ hash_version: 1, content_hash: "h1", storage_path: "t1.mp3" }),
    );
    jobs.claimJob.mockResolvedValue(job({ id: "job-2", status: "pending", storage_path: null }));
    const result = await getOrCreateAudio(admin, subject({ legacyHash: "changed" }));
    expect(result).toMatchObject({ status: "ready", generation: { units: 20 } });
    expect(jobs.claimJob).toHaveBeenCalledWith(admin, expect.anything(), false);
  });

  it("records the path before uploading, then marks the job ready", async () => {
    jobs.getLiveJob.mockResolvedValue(null);
    jobs.claimJob.mockResolvedValue(job({ id: "job-2", status: "pending", storage_path: null }));
    const order: string[] = [];
    jobs.setJobPath.mockImplementation(async () => (order.push("path"), true));
    uploadAudio.mockImplementation(async () => void order.push("upload"));
    jobs.markReady.mockImplementation(async () => (order.push("ready"), true));

    const result = await getOrCreateAudio(admin, subject());
    expect(order).toEqual(["path", "upload", "ready"]);
    expect(uploadAudio).toHaveBeenCalledWith(PATH, expect.any(Buffer));
    expect(result).toMatchObject({ status: "ready", job: { id: "job-2", storage_path: PATH } });
  });

  it("marks the job failed and reports the units when the provider fails", async () => {
    jobs.getLiveJob.mockResolvedValue(job({ status: "failed" }));
    jobs.claimJob.mockResolvedValue(job({ id: "job-2", status: "pending", storage_path: null }));
    synthesizeSpeech.mockRejectedValue(new Error("quota"));
    const result = await getOrCreateAudio(admin, subject());
    expect(result).toEqual({ status: "unavailable", generation: { units: 20 } });
    expect(jobs.markFailed).toHaveBeenCalledWith(admin, "job-2", "quota");
  });

  it("does not call the provider when the job was superseded before it started", async () => {
    jobs.getLiveJob.mockResolvedValue(null);
    jobs.claimJob.mockResolvedValue(job({ id: "job-2", status: "pending", storage_path: null }));
    jobs.setJobPath.mockResolvedValue(false);
    expect(await getOrCreateAudio(admin, subject())).toEqual({ status: "pending" });
    expect(synthesizeSpeech).not.toHaveBeenCalled();
  });

  it("removes its own file when it was superseded while generating", async () => {
    jobs.getLiveJob.mockResolvedValue(null);
    jobs.claimJob.mockResolvedValue(job({ id: "job-2", status: "pending", storage_path: null }));
    jobs.markReady.mockResolvedValue(false);
    expect(await getOrCreateAudio(admin, subject())).toEqual({ status: "pending" });
    expect(deleteAudio).toHaveBeenCalledWith(PATH);
  });

  it("answers pending for a fresh pending job when it may not wait", async () => {
    jobs.getLiveJob.mockResolvedValue(job({ status: "pending", storage_path: null }));
    expect(await getOrCreateAudio(admin, subject())).toEqual({ status: "pending" });
    expect(jobs.claimJob).not.toHaveBeenCalled();
  });

  it("does not count a person polling their own running story against the cap", async () => {
    jobs.getLiveJob.mockResolvedValue(job({ status: "pending", storage_path: null }));
    const allowGeneration = vi.fn().mockResolvedValue(false);
    expect(await getOrCreateAudio(admin, subject(), { allowGeneration })).toEqual({
      status: "pending",
    });
    expect(allowGeneration).not.toHaveBeenCalled();
  });

  it("reclaims a pending job that has gone stale", async () => {
    const stale = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    jobs.getLiveJob.mockResolvedValue(
      job({ status: "pending", storage_path: null, requested_at: stale }),
    );
    jobs.claimJob.mockResolvedValue(job({ id: "job-2", status: "pending", storage_path: null }));
    expect(await getOrCreateAudio(admin, subject())).toMatchObject({ status: "ready" });
  });

  it("answers capped, and claims nothing, when the cap says no", async () => {
    jobs.getLiveJob.mockResolvedValue(null);
    const result = await getOrCreateAudio(admin, subject(), {
      allowGeneration: async () => false,
    });
    expect(result).toEqual({ status: "capped" });
    expect(jobs.claimJob).not.toHaveBeenCalled();
  });

  it("waits for the winner when it loses the claim and returns their clip", async () => {
    vi.useFakeTimers();
    try {
      const pending = job({ status: "pending", storage_path: null });
      jobs.getLiveJob
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(pending)
        .mockResolvedValue(job({ id: "job-9" }));
      jobs.claimJob.mockResolvedValue(null);
      const promise = getOrCreateAudio(admin, subject(), { waitMs: 30_000 });
      await vi.advanceTimersByTimeAsync(2000);
      expect(await promise).toMatchObject({ status: "ready", job: { id: "job-9" } });
      expect(synthesizeSpeech).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops waiting when the winner fails", async () => {
    jobs.getLiveJob
      .mockResolvedValueOnce(null)
      .mockResolvedValue(job({ status: "failed", storage_path: null }));
    jobs.claimJob.mockResolvedValue(null);
    expect(await getOrCreateAudio(admin, subject(), { waitMs: 30_000 })).toEqual({
      status: "unavailable",
    });
  });

  it("passes an explicit regenerate to the claim and skips the current-clip shortcut", async () => {
    jobs.getLiveJob.mockResolvedValue(job());
    jobs.claimJob.mockResolvedValue(job({ id: "job-2", status: "pending", storage_path: null }));
    await getOrCreateAudio(admin, subject(), { regenerate: true });
    expect(jobs.claimJob).toHaveBeenCalledWith(admin, expect.anything(), true);
  });

  it("fails the job when the subject has nothing to narrate", async () => {
    jobs.getLiveJob.mockResolvedValue(null);
    jobs.claimJob.mockResolvedValue(job({ id: "job-2", status: "pending", storage_path: null }));
    const result = await getOrCreateAudio(admin, subject({ loadScript: async () => null }));
    expect(result).toEqual({ status: "unavailable", generation: { units: 0 } });
    expect(synthesizeSpeech).not.toHaveBeenCalled();
  });
});
