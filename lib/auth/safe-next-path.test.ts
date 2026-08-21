import { describe, expect, it } from "vitest";
import { appendNextParam, safeNextPath } from "./safe-next-path";

describe("safeNextPath", () => {
  it("falls back for null and empty input", () => {
    expect(safeNextPath(null)).toBe("/jargon");
    expect(safeNextPath("")).toBe("/jargon");
  });

  it("passes through plain in-app paths", () => {
    expect(safeNextPath("/jargon")).toBe("/jargon");
    expect(safeNextPath("/jargon/collections/abc")).toBe("/jargon/collections/abc");
  });

  it("preserves search and hash", () => {
    expect(safeNextPath("/jargon?tab=quiz")).toBe("/jargon?tab=quiz");
    expect(safeNextPath("/jargon?tab=quiz#top")).toBe("/jargon?tab=quiz#top");
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeNextPath("//evil.com")).toBe("/jargon");
    expect(safeNextPath("//evil.com/jargon")).toBe("/jargon");
  });

  it("rejects absolute URLs", () => {
    expect(safeNextPath("https://evil.com")).toBe("/jargon");
    expect(safeNextPath("http://evil.com/jargon")).toBe("/jargon");
  });

  it("rejects backslash escapes that URL parsing treats as slashes", () => {
    expect(safeNextPath("/\\evil.com")).toBe("/jargon");
    expect(safeNextPath("\\/\\/evil.com")).toBe("/jargon");
    expect(safeNextPath("/\\/evil.com")).toBe("/jargon");
  });

  it("rejects non-path schemes", () => {
    expect(safeNextPath("javascript:alert(1)")).toBe("/jargon");
  });

  it("honors a custom fallback", () => {
    expect(safeNextPath(null, "/complete-signup")).toBe("/complete-signup");
    expect(safeNextPath("//evil.com", "/complete-signup")).toBe("/complete-signup");
    expect(safeNextPath("/jargon", "/complete-signup")).toBe("/jargon");
  });
});

describe("appendNextParam", () => {
  it("appends a sanitized next param", () => {
    expect(appendNextParam("/signup", "/jargon?tab=quiz")).toBe(
      "/signup?next=%2Fjargon%3Ftab%3Dquiz",
    );
    expect(appendNextParam("/signup", "//evil.com")).toBe("/signup?next=%2Fjargon");
  });

  it("returns the path unchanged when next is missing", () => {
    expect(appendNextParam("/signup", null)).toBe("/signup");
    expect(appendNextParam("/signup", undefined)).toBe("/signup");
  });

  it("preserves existing query params on the path", () => {
    expect(appendNextParam("/signup?ref=abc", "/jargon")).toBe("/signup?ref=abc&next=%2Fjargon");
  });
});
