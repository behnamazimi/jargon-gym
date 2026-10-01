import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function termsFor(url: string) {
  const ids = new URL(url, "http://test").searchParams.get("ids")!.split(",");
  return ids.map((termId) => ({ id: termId, term: termId, relationships: [] }));
}

describe("term details store", () => {
  const fetchMock = vi.fn(async (url: string) => Response.json({ terms: termsFor(url) }));

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("gathers rows asking at the same time into one request", async () => {
    const { prefetchTermDetails } = await import("./details-store");
    prefetchTermDetails([id(1), id(2)]);
    prefetchTermDetails([id(2), id(3)]);
    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toContain(`${id(1)},${id(2)},${id(3)}`);
  });

  it("splits a large batch and doesn't ask twice for loaded terms", async () => {
    const { prefetchTermDetails } = await import("./details-store");
    prefetchTermDetails(Array.from({ length: 60 }, (_, i) => id(i)));
    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    prefetchTermDetails([id(1), id(59)]);
    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("loads one term right away and resolves with it", async () => {
    const { loadTermDetails } = await import("./details-store");
    const term = await loadTermDetails(id(7));
    expect(term?.id).toBe(id(7));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("resolves undefined when the request fails, and retries later", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    const { loadTermDetails } = await import("./details-store");
    expect(await loadTermDetails(id(1))).toBeUndefined();
    expect((await loadTermDetails(id(1)))?.id).toBe(id(1));
  });
});
