import { describe, expect, it } from "vitest";
import {
  parseQuizSetupCookie,
  questionCountFor,
  quizSetupToSave,
  resolveInitialQuizSetup,
  type InitialQuizSetup,
} from "./setup-preference";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

function cookie(value: unknown): string {
  return encodeURIComponent(JSON.stringify(value));
}

describe("parseQuizSetupCookie", () => {
  it("reads a full setup", () => {
    expect(parseQuizSetupCookie(cookie({ style: "ai", count: 12, collectionId: A }))).toEqual({
      style: "ai",
      count: 12,
      collectionId: A,
    });
  });

  it("ignores missing, malformed or foreign values", () => {
    expect(parseQuizSetupCookie(undefined)).toBeNull();
    expect(parseQuizSetupCookie("%E0%A4%A")).toBeNull();
    expect(parseQuizSetupCookie("not json")).toBeNull();
    expect(parseQuizSetupCookie(cookie({ style: "hard" }))).toBeNull();
  });

  it("drops out-of-range counts and bad collection ids but keeps the style", () => {
    expect(parseQuizSetupCookie(cookie({ style: "simple", count: 0, collectionId: "x" }))).toEqual({
      style: "simple",
    });
    expect(parseQuizSetupCookie(cookie({ style: "simple", count: 31 }))).toEqual({
      style: "simple",
    });
    expect(parseQuizSetupCookie(cookie({ style: "simple", count: 2.5 }))).toEqual({
      style: "simple",
    });
  });
});

describe("resolveInitialQuizSetup", () => {
  it("defaults to simple, all, and no explicit count", () => {
    expect(
      resolveInitialQuizSetup({
        saved: null,
        collectionParam: undefined,
        activeIds: [A],
        aiAvailable: true,
      }),
    ).toEqual({
      style: "simple",
      collectionId: "all",
      count: null,
      savedCollectionId: null,
      collectionFromLink: false,
      aiFellBack: false,
    });
  });

  it("falls back to simple, and says so, when AI isn't available", () => {
    const setup = resolveInitialQuizSetup({
      saved: { style: "ai" },
      collectionParam: undefined,
      activeIds: [A],
      aiAvailable: false,
    });
    expect(setup.style).toBe("simple");
    expect(setup.aiFellBack).toBe(true);
  });

  it("stays on AI when it is available", () => {
    const setup = resolveInitialQuizSetup({
      saved: { style: "ai" },
      collectionParam: undefined,
      activeIds: [A],
      aiAvailable: true,
    });
    expect(setup).toMatchObject({ style: "ai", aiFellBack: false });
  });

  it("uses the remembered collection only while it's active", () => {
    const base = {
      saved: { style: "simple" as const, collectionId: A },
      collectionParam: undefined,
    };
    expect(
      resolveInitialQuizSetup({ ...base, activeIds: [A, B], aiAvailable: false }).collectionId,
    ).toBe(A);
    expect(
      resolveInitialQuizSetup({ ...base, activeIds: [B], aiAvailable: false }).collectionId,
    ).toBe("all");
  });

  it("lets a valid link win and marks it as coming from the link", () => {
    const setup = resolveInitialQuizSetup({
      saved: { style: "simple", collectionId: A },
      collectionParam: B,
      activeIds: [A, B],
      aiAvailable: false,
    });
    expect(setup).toMatchObject({
      collectionId: B,
      collectionFromLink: true,
      savedCollectionId: A,
    });
  });

  it("ignores a link to a paused collection", () => {
    const setup = resolveInitialQuizSetup({
      saved: null,
      collectionParam: B,
      activeIds: [A],
      aiAvailable: false,
    });
    expect(setup).toMatchObject({ collectionId: "all", collectionFromLink: false });
  });
});

describe("questionCountFor", () => {
  it("defaults to 10, capped to what's available", () => {
    expect(questionCountFor(null, 30)).toBe(10);
    expect(questionCountFor(null, 4)).toBe(4);
  });

  it("caps an explicit pick instead of resetting it", () => {
    expect(questionCountFor(20, 30)).toBe(20);
    expect(questionCountFor(20, 6)).toBe(6);
  });

  it("never goes below 1", () => {
    expect(questionCountFor(null, 0)).toBe(1);
  });
});

describe("quizSetupToSave", () => {
  const fromLink: InitialQuizSetup = {
    style: "simple",
    collectionId: B,
    count: null,
    savedCollectionId: A,
    collectionFromLink: true,
    aiFellBack: false,
  };

  it("keeps the remembered collection after an unchanged link visit", () => {
    expect(
      quizSetupToSave({
        style: "simple",
        preferredCount: null,
        selectedCollectionId: B,
        collectionChanged: false,
        initial: fromLink,
      }),
    ).toEqual({ style: "simple", collectionId: A });
  });

  it("remembers a collection the user picked", () => {
    expect(
      quizSetupToSave({
        style: "ai",
        preferredCount: 5,
        selectedCollectionId: "all",
        collectionChanged: true,
        initial: fromLink,
      }),
    ).toEqual({ style: "ai", count: 5, collectionId: "all" });
  });

  it("omits the collection when a link visit had nothing remembered", () => {
    expect(
      quizSetupToSave({
        style: "simple",
        preferredCount: null,
        selectedCollectionId: B,
        collectionChanged: false,
        initial: { ...fromLink, savedCollectionId: null },
      }),
    ).toEqual({ style: "simple" });
  });
});
