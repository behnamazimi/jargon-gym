import { describe, expect, it } from "vitest";
import { parseShell, SHELL_RESTORE_SCRIPT } from "./shell";

const CHROME = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36";

describe("parseShell", () => {
  it("treats a normal browser as not native", () => {
    expect(parseShell(CHROME)).toEqual({ native: false });
  });

  it.each(["ios", "android"] as const)("reads the os the %s app reports", (os) => {
    expect(parseShell(`${CHROME} LobyasApp/${os}`)).toEqual({ native: true, os });
  });

  it("recognises an older app that sends no os", () => {
    expect(parseShell(`${CHROME} LobyasApp`)).toEqual({ native: true, os: null });
  });

  it("ignores an unknown os", () => {
    expect(parseShell(`${CHROME} LobyasApp/windows`)).toEqual({ native: true, os: null });
  });
});

describe("SHELL_RESTORE_SCRIPT", () => {
  function attributeFor(userAgent: string) {
    const attributes = new Map<string, string>();
    const document = {
      documentElement: { setAttribute: (k: string, v: string) => attributes.set(k, v) },
    };
    new Function("document", "navigator", SHELL_RESTORE_SCRIPT)(document, { userAgent });
    return attributes.get("data-shell");
  }

  it.each([
    ["LobyasApp/ios", "ios"],
    ["LobyasApp/android", "android"],
    ["LobyasApp", "app"],
  ])("marks %s", (suffix, expected) => {
    expect(attributeFor(`${CHROME} ${suffix}`)).toBe(expected);
  });

  it("leaves a normal browser unmarked", () => {
    expect(attributeFor(CHROME)).toBeUndefined();
  });
});
