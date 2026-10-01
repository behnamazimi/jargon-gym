import { describe, expect, it } from "vitest";
import { blockedMessage, entryFor } from "./entry";
import type { RequestQuota } from "./types";

const quota: RequestQuota = {
  enabled: true,
  paused: false,
  estimateDays: 2,
  used: 0,
  limit: 3,
  nextAvailableAt: null,
  openRequestId: null,
  openRequestTopic: null,
};

describe("entryFor", () => {
  const cases: [string, Partial<RequestQuota>, string][] = [
    ["available", {}, "available"],
    ["used some", { used: 2 }, "available"],
    ["closed", { enabled: false }, "closed"],
    [
      "an open request wins over closed",
      { enabled: false, openRequestId: "r1", openRequestTopic: "Helm" },
      "open",
    ],
    ["the cap", { used: 3, nextAvailableAt: "2026-10-20T10:00:00Z" }, "cap"],
    ["the cap without a date still lets the quota number decide", { used: 3 }, "available"],
  ];

  it.each(cases)("%s", (_name, patch, state) => {
    expect(entryFor({ ...quota, ...patch }, "UTC").state).toBe(state);
  });

  it("formats the date in the person's zone", () => {
    const entry = entryFor(
      { ...quota, used: 3, nextAvailableAt: "2026-10-20T23:30:00Z" },
      "Europe/Amsterdam",
    );
    expect(entry).toEqual({ state: "cap", date: "Wed 21 Oct" });
  });

  it("carries the pause flag and estimate", () => {
    expect(entryFor({ ...quota, paused: true, estimateDays: 7 }, null)).toEqual({
      state: "available",
      used: 0,
      estimateDays: 7,
      paused: true,
    });
  });
});

describe("blockedMessage", () => {
  it("says nothing when a request can be sent", () => {
    expect(
      blockedMessage({ state: "available", used: 0, estimateDays: 2, paused: false }),
    ).toBeNull();
  });

  it("names the open request", () => {
    expect(blockedMessage({ state: "open", topic: "Helm" })).toContain("Helm");
  });

  it("gives the date when out of requests", () => {
    expect(blockedMessage({ state: "cap", date: "Sat 3 Oct" })).toContain("Sat 3 Oct");
  });
});
