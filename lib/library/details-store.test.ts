import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const SCOPE = "collection:1";

function idsOf(url: string) {
  return new URL(url, "http://test").searchParams.get("ids")!.split(",");
}

function reply(url: string, definition = "current") {
  return Response.json({
    terms: idsOf(url).map((termId) => ({
      id: termId,
      term: termId,
      definition,
      relationships: [],
    })),
  });
}

describe("term details store", () => {
  const fetchMock = vi.fn(async (url: string) => reply(url));

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url: string) => reply(url));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("gathers rows asking at the same time into one request", async () => {
    const { prefetchTermDetails } = await import("./details-store");
    prefetchTermDetails(SCOPE, [id(1), id(2)]);
    prefetchTermDetails(SCOPE, [id(2), id(3)]);
    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(idsOf(fetchMock.mock.calls[0]![0])).toEqual([id(1), id(2), id(3)]);
  });

  it("splits a large batch and doesn't ask twice for loaded terms", async () => {
    const { prefetchTermDetails } = await import("./details-store");
    prefetchTermDetails(
      SCOPE,
      Array.from({ length: 60 }, (_, i) => id(i)),
    );
    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    prefetchTermDetails(SCOPE, [id(1), id(59)]);
    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("starts fresh for a new snapshot of the collection", async () => {
    const { loadTermDetails } = await import("./details-store");
    await loadTermDetails(SCOPE, id(1));
    await loadTermDetails("collection:2", id(1));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("ignores an answer that arrives after its snapshot was dropped", async () => {
    let answerStale: () => void = () => {};
    fetchMock.mockImplementationOnce(
      (url: string) =>
        new Promise((resolve) => {
          answerStale = () => resolve(reply(url, "stale"));
        }),
    );
    const { forgetTermDetails, loadTermDetails, prefetchTermDetails } =
      await import("./details-store");
    prefetchTermDetails(SCOPE, [id(1)]);
    await vi.advanceTimersByTimeAsync(50);

    forgetTermDetails(SCOPE);
    expect((await loadTermDetails(SCOPE, id(1)))?.definition).toBe("current");
    answerStale();
    await vi.runAllTimersAsync();

    expect((await loadTermDetails(SCOPE, id(1)))?.definition).toBe("current");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("leaves a failed term alone until it is retried", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    const { prefetchTermDetails, retryTermDetails } = await import("./details-store");
    prefetchTermDetails(SCOPE, [id(1)]);
    await vi.runAllTimersAsync();

    prefetchTermDetails(SCOPE, [id(1)]);
    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    retryTermDetails(SCOPE, id(1));
    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("loads one term right away, and tries a failed one again", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    const { loadTermDetails } = await import("./details-store");
    expect(await loadTermDetails(SCOPE, id(7))).toBeUndefined();
    expect((await loadTermDetails(SCOPE, id(7)))?.id).toBe(id(7));
  });
});
