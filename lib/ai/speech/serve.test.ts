import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SpeechSubject } from "./types";

const getReadyAudio = vi.fn();
const markFileMissing = vi.fn();
const downloadAudio = vi.fn();

class AudioMissingError extends Error {}

vi.mock("./audio", () => ({ getReadyAudio }));
vi.mock("./jobs", () => ({ markFileMissing }));
vi.mock("./storage", () => ({ downloadAudio, AudioMissingError }));

const { serveAudio } = await import("./serve");

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

  it("answers a matching ETag with 304 and keeps revalidating", async () => {
    const res = await serveAudio(request({ "if-none-match": '"job-1"' }), admin, subject);
    expect(res.status).toBe(304);
    expect(res.headers.get("ETag")).toBe('"job-1"');
    expect(res.headers.get("Cache-Control")).toBe("private, no-cache");
    expect(downloadAudio).not.toHaveBeenCalled();
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
