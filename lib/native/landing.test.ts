import { describe, expect, it } from "vitest";
import { nativeLandingPath } from "./landing";

const BROWSER = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1";
const APP = `${BROWSER} LobyasApp/ios`;

describe("nativeLandingPath", () => {
  it("sends a signed-in app to the study area", () => {
    expect(nativeLandingPath("/", APP, true)).toBe("/app/review");
  });

  it("sends a signed-out app to login", () => {
    expect(nativeLandingPath("/", APP, false)).toBe("/login");
  });

  it("leaves the website's home page to browsers", () => {
    expect(nativeLandingPath("/", BROWSER, true)).toBeNull();
    expect(nativeLandingPath("/", null, false)).toBeNull();
  });

  it("leaves every other page to the app's visitor", () => {
    expect(nativeLandingPath("/about", APP, false)).toBeNull();
    expect(nativeLandingPath("/app/library", APP, true)).toBeNull();
  });
});
