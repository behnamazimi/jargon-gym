import { describe, expect, it } from "vitest";
import {
  isDockPath,
  isLibraryPath,
  isMorePath,
  isNestedFlowPath,
  isStudyPath,
  studyBackTarget,
} from "./chrome";

describe("isStudyPath", () => {
  it("treats jargon and admin as study chrome", () => {
    expect(isStudyPath("/app/library")).toBe(true);
    expect(isStudyPath("/app/read")).toBe(true);
    expect(isStudyPath("/admin/people")).toBe(true);
  });

  it("treats marketing, auth, and public glossary as the website", () => {
    expect(isStudyPath("/")).toBe(false);
    expect(isStudyPath("/login")).toBe(false);
    expect(isStudyPath("/collections/software")).toBe(false);
    expect(isStudyPath("/how-terms-work")).toBe(false);
    expect(isStudyPath("/~offline")).toBe(false);
    expect(isStudyPath("/apple-icon")).toBe(false);
  });
});

describe("isLibraryPath", () => {
  it("is only the collections hub", () => {
    expect(isLibraryPath("/app/library")).toBe(true);
    expect(isLibraryPath("/app/read")).toBe(false);
  });
});

describe("isMorePath", () => {
  it("covers overflow destinations", () => {
    expect(isMorePath("/app/settings")).toBe(true);
    expect(isMorePath("/app/capture")).toBe(true);
    expect(isMorePath("/admin/collections")).toBe(true);
    expect(isMorePath("/admin/system/audit")).toBe(true);
    expect(isMorePath("/app/read")).toBe(false);
    expect(isMorePath("/app/library")).toBe(false);
  });
});

describe("isDockPath", () => {
  it("is the four primary study tabs", () => {
    expect(isDockPath("/app/library")).toBe(true);
    expect(isDockPath("/app/read")).toBe(true);
    expect(isDockPath("/app/review")).toBe(true);
    expect(isDockPath("/app/quiz")).toBe(true);
  });

  it("hides the dock on overflow sub-pages", () => {
    expect(isDockPath("/app/settings")).toBe(false);
    expect(isDockPath("/app/browse")).toBe(false);
    expect(isDockPath("/admin/people")).toBe(false);
    expect(isDockPath("/login")).toBe(false);
  });
});

describe("studyBackTarget", () => {
  it("returns dock pages with their query", () => {
    expect(studyBackTarget("/app/quiz", "")).toBe("/app/quiz");
    expect(studyBackTarget("/app/library", "collection=abc")).toBe("/app/library?collection=abc");
    expect(studyBackTarget("/app/read/stories", "collection=abc")).toBe(
      "/app/read/stories?collection=abc",
    );
  });

  it("never targets overflow or website pages", () => {
    expect(studyBackTarget("/app/settings", "tab=ai")).toBeNull();
    expect(studyBackTarget("/admin/people", "")).toBeNull();
    expect(studyBackTarget("/how-terms-work", "")).toBeNull();
  });
});

describe("isNestedFlowPath", () => {
  it.each([
    ["/app/import", false],
    ["/app/import/paste", true],
    ["/app/import/apps", true],
    ["/app/import/apps/quizlet", true],
    ["/app/import/more", true],
    ["/app/import/request", true],
    ["/app/capture", true],
    ["/app/settings", false],
    ["/app/read", false],
    ["/app/library", false],
  ])("%s -> %s", (path, expected) => {
    expect(isNestedFlowPath(path)).toBe(expected);
  });
});
