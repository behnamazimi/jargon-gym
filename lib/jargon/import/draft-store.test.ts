import { afterEach, describe, expect, it, vi } from "vitest";
import { clearDraft, readDraft, writeDraft } from "./draft-store";

function fakeWindow(storage: Partial<Storage>) {
  vi.stubGlobal("window", { localStorage: storage, dispatchEvent: () => true });
}

afterEach(() => vi.unstubAllGlobals());

describe("draft store", () => {
  it("keeps and clears a draft", () => {
    const data = new Map<string, string>();
    fakeWindow({
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => void data.set(key, value),
      removeItem: (key) => void data.delete(key),
    });
    writeDraft("API – a way");
    expect(readDraft()).toBe("API – a way");
    clearDraft();
    expect(readDraft()).toBe("");
  });

  it("survives storage that throws", () => {
    const boom = () => {
      throw new Error("blocked");
    };
    fakeWindow({ getItem: boom, setItem: boom, removeItem: boom });
    expect(() => writeDraft("x")).not.toThrow();
    expect(readDraft()).toBe("");
  });

  it("works with no window at all", () => {
    expect(readDraft()).toBe("");
    expect(() => writeDraft("x")).not.toThrow();
  });
});
