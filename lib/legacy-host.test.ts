import { describe, expect, it } from "vitest";
import { legacyHostRedirect } from "./legacy-host";

const base = {
  host: "jargon-gym.vercel.app",
  method: "GET",
  pathname: "/app/library",
  search: "?collection=abc",
  target: "https://lobyas.com",
};

describe("legacyHostRedirect", () => {
  it("sends a page on the old host to the same path and query on the new one", () => {
    expect(legacyHostRedirect(base)).toBe("https://lobyas.com/app/library?collection=abc");
  });

  it("does nothing until a target is set", () => {
    expect(legacyHostRedirect({ ...base, target: undefined })).toBeNull();
  });

  it("only touches the exact old host", () => {
    for (const host of ["localhost:3000", "lobyas.com", "jargon-gym-git-x.vercel.app", null])
      expect(legacyHostRedirect({ ...base, host })).toBeNull();
  });

  it("ignores a port on the old host", () => {
    expect(legacyHostRedirect({ ...base, host: "jargon-gym.vercel.app:443" })).not.toBeNull();
  });

  it("leaves the API, downloads and auth paths on the old host", () => {
    for (const pathname of [
      "/api/widget/state",
      "/downloads/jargon-gym.widget.zip",
      "/auth/callback",
      "/install-widget.sh",
    ])
      expect(legacyHostRedirect({ ...base, pathname }), pathname).toBeNull();
  });

  it("leaves non-page methods alone", () => {
    expect(legacyHostRedirect({ ...base, method: "POST" })).toBeNull();
  });
});
