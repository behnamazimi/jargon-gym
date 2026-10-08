import { describe, expect, it } from "vitest";
import { checkFeaturePolicy, type FeatureSettings } from "./feature-settings";

function settings(overrides: Partial<FeatureSettings>): FeatureSettings {
  return {
    feature: "narration_term",
    billable: false,
    enabled: true,
    accessMode: "allowlist",
    dailyCap: null,
    unit: "clip",
    ...overrides,
  };
}

const nobody = { isAdmin: false, onAllowlist: false };

describe("checkFeaturePolicy", () => {
  it("blocks everyone, admins too, when the feature is off", () => {
    expect(
      checkFeaturePolicy(settings({ enabled: false }), { isAdmin: true, onAllowlist: true }),
    ).toEqual({
      usable: false,
      reason: "disabled",
    });
  });

  it("lets everyone in for everyone mode", () => {
    expect(checkFeaturePolicy(settings({ accessMode: "everyone" }), nobody)).toEqual({
      usable: true,
    });
  });

  it("needs an allowlist row for allowlist mode", () => {
    expect(checkFeaturePolicy(settings({}), nobody)).toEqual({
      usable: false,
      reason: "not-allowed",
    });
    expect(checkFeaturePolicy(settings({}), { isAdmin: false, onAllowlist: true })).toEqual({
      usable: true,
    });
  });

  it("keeps admin mode to admins, and lets admins through the other modes", () => {
    expect(
      checkFeaturePolicy(settings({ accessMode: "admin" }), { isAdmin: false, onAllowlist: true }),
    ).toEqual({ usable: false, reason: "not-allowed" });
    expect(
      checkFeaturePolicy(settings({ accessMode: "admin" }), { isAdmin: true, onAllowlist: false }),
    ).toEqual({
      usable: true,
    });
    expect(checkFeaturePolicy(settings({}), { isAdmin: true, onAllowlist: false })).toEqual({
      usable: true,
    });
  });
});
