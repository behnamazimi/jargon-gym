import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SpeechSubject } from "./types";

const getReadyAudio = vi.fn();
const markFileMissing = vi.fn();
const downloadAudio = vi.fn();

class AudioMissingError extends Error {}

vi.mock("./audio", () => ({ getReadyAudio }));
vi.mock("./jobs", () => ({ markFileMissing }));
vi.mock("./storage", () => ({ downloadAudio, AudioMissingError }));

const { serveAudio, serveJob } = await import("./serve");

const admin = {} as never;
const subject = { type: "term", id: "t1" } as SpeechSubject;
const READY = { id: "job-1", storage_path: "terms/t1/2/h/job-1.mp3" };

function request(headers: Record<string, string> = {}) {
  return new Request("http://localhost/x", { headers });
}

beforeEach(() => {
  vi.resetAllMocks();
  getReadyAudio.mockResolvedValue(READY);
});

describe("serveAudio", () => {
  it("is a 404 when there is no current clip, and never generates", async () => {
    getReadyAudio.mockResolvedValue(null);
    expect((await serveAudio(request(), admin, subject)).status).toBe(404);
    expect(downloadAudio).not.toHaveBeenCalled();
  });

  it("never lets a miss be cached", async () => {
    getReadyAudio.mockResolvedValue(null);
    expect((await serveAudio(request(), admin, subject)).headers.get("Cache-Control")).toBe(
      "no-store",
    );
    downloadAudio.mockRejectedValue(new Error("s3 down"));
    expect((await serveAudio(request(), admin, subject)).headers.get("Cache-Control")).toBe(
      "no-store",
    );
  });

  it("answers a matching ETag with 304 and keeps revalidating", async () => {
    const res = await serveAudio(request({ "if-none-match": '"job-1"' }), admin, subject);
    expect(res.status).toBe(304);
    expect(res.headers.get("ETag")).toBe('"job-1"');
    expect(res.headers.get("Cache-Control")).toBe("private, no-cache");
    expect(downloadAudio).not.toHaveBeenCalled();
  });

  it("matches a weak ETag and one inside a list", async () => {
    for (const header of ['W/"job-1"', '"other", "job-1"']) {
      const res = await serveAudio(request({ "if-none-match": header }), admin, subject);
      expect(res.status).toBe(304);
    }
  });

  it("streams a range request as 206", async () => {
    downloadAudio.mockResolvedValue({
      stream: new ReadableStream(),
      contentLength: 10,
      contentRange: "bytes 0-9/100",
      partial: true,
    });
    const res = await serveAudio(request({ range: "bytes=0-9" }), admin, subject);
    expect(downloadAudio).toHaveBeenCalledWith(READY.storage_path, "bytes=0-9");
    expect(res.status).toBe(206);
    expect(res.headers.get("Content-Range")).toBe("bytes 0-9/100");
    expect(res.headers.get("Accept-Ranges")).toBe("bytes");
  });

  it("streams the whole file as 200", async () => {
    downloadAudio.mockResolvedValue({ stream: new ReadableStream(), partial: false });
    const res = await serveAudio(request(), admin, subject);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
  });

  it("fails the job and answers 404 when the file is missing", async () => {
    downloadAudio.mockRejectedValue(new AudioMissingError("gone"));
    expect((await serveAudio(request(), admin, subject)).status).toBe(404);
    expect(markFileMissing).toHaveBeenCalledWith(admin, "job-1");
  });

  it("answers 502 on other storage errors without touching the job", async () => {
    downloadAudio.mockRejectedValue(new Error("s3 down"));
    expect((await serveAudio(request(), admin, subject)).status).toBe(502);
    expect(markFileMissing).not.toHaveBeenCalled();
  });
});

describe("serveJob", () => {
  it("lets the browser keep a versioned clip for a day, 200 and 206 alike", async () => {
    downloadAudio.mockResolvedValue({ stream: new ReadableStream(), partial: false });
    const whole = await serveJob(request(), admin, READY, { versioned: true });
    expect(whole.headers.get("Cache-Control")).toBe("private, max-age=86400, immutable");

    downloadAudio.mockResolvedValue({
      stream: new ReadableStream(),
      contentRange: "bytes 0-9/100",
      partial: true,
    });
    const part = await serveJob(request({ range: "bytes=0-9" }), admin, READY, {
      versioned: true,
    });
    expect(part.status).toBe(206);
    expect(part.headers.get("Cache-Control")).toBe("private, max-age=86400, immutable");
  });

  it("keeps an unversioned clip revalidating", async () => {
    downloadAudio.mockResolvedValue({ stream: new ReadableStream(), partial: false });
    const res = await serveJob(request(), admin, READY, { versioned: false });
    expect(res.headers.get("Cache-Control")).toBe("private, no-cache");
  });

  it("is an uncacheable 404 for a job with no file path", async () => {
    const res = await serveJob(
      request(),
      admin,
      { id: "j", storage_path: null },
      { versioned: true },
    );
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
