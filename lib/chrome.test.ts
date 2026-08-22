import { describe, expect, it } from "vitest";
import { isDockPath, isLibraryPath, isMorePath, isStudyPath } from "./chrome";

describe("isStudyPath", () => {
  it("treats jargon and admin as study chrome", () => {
    expect(isStudyPath("/jargon")).toBe(true);
    expect(isStudyPath("/jargon/read")).toBe(true);
    expect(isStudyPath("/admin/invites")).toBe(true);
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
    expect(isMorePath("/admin/collections")).toBe(true);
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
    expect(isDockPath("/admin/invites")).toBe(false);
    expect(isDockPath("/login")).toBe(false);
  });
});
