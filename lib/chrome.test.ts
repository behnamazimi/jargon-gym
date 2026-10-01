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
    expect(isStudyPath("/jargon")).toBe(true);
    expect(isStudyPath("/jargon/read")).toBe(true);
    expect(isStudyPath("/admin/people")).toBe(true);
  });

  it("treats marketing, auth, and public glossary as the website", () => {
    expect(isStudyPath("/")).toBe(false);
    expect(isStudyPath("/login")).toBe(false);
    expect(isStudyPath("/j/software")).toBe(false);
    expect(isStudyPath("/how-terms-work")).toBe(false);
    expect(isStudyPath("/~offline")).toBe(false);
  });
});

describe("isLibraryPath", () => {
  it("is only the collections hub", () => {
    expect(isLibraryPath("/jargon")).toBe(true);
    expect(isLibraryPath("/jargon/read")).toBe(false);
  });
});

describe("isMorePath", () => {
  it("covers overflow destinations", () => {
    expect(isMorePath("/jargon/settings")).toBe(true);
    expect(isMorePath("/jargon/capture")).toBe(true);
    expect(isMorePath("/admin/collections")).toBe(true);
    expect(isMorePath("/admin/system/audit")).toBe(true);
    expect(isMorePath("/jargon/read")).toBe(false);
    expect(isMorePath("/jargon")).toBe(false);
  });
});

describe("isDockPath", () => {
  it("is the four primary study tabs", () => {
    expect(isDockPath("/jargon")).toBe(true);
    expect(isDockPath("/jargon/read")).toBe(true);
    expect(isDockPath("/jargon/review")).toBe(true);
    expect(isDockPath("/jargon/quiz")).toBe(true);
  });

  it("hides the dock on overflow sub-pages", () => {
    expect(isDockPath("/jargon/settings")).toBe(false);
    expect(isDockPath("/jargon/browse")).toBe(false);
    expect(isDockPath("/admin/people")).toBe(false);
    expect(isDockPath("/login")).toBe(false);
  });
});

describe("studyBackTarget", () => {
  it("returns dock pages with their query", () => {
    expect(studyBackTarget("/jargon/quiz", "")).toBe("/jargon/quiz");
    expect(studyBackTarget("/jargon", "domain=abc")).toBe("/jargon?domain=abc");
    expect(studyBackTarget("/jargon/read/stories", "domain=abc")).toBe(
      "/jargon/read/stories?domain=abc",
    );
  });

  it("never targets overflow or website pages", () => {
    expect(studyBackTarget("/jargon/settings", "tab=ai")).toBeNull();
    expect(studyBackTarget("/admin/people", "")).toBeNull();
    expect(studyBackTarget("/how-terms-work", "")).toBeNull();
  });
});

describe("isNestedFlowPath", () => {
  it.each([
    ["/jargon/import", false],
    ["/jargon/import/paste", true],
    ["/jargon/import/apps", true],
    ["/jargon/import/apps/quizlet", true],
    ["/jargon/import/more", true],
    ["/jargon/import/request", true],
    ["/jargon/capture", true],
    ["/jargon/settings", false],
    ["/jargon/read", false],
    ["/jargon", false],
  ])("%s -> %s", (path, expected) => {
    expect(isNestedFlowPath(path)).toBe(expected);
  });
});
