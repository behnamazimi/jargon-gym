import { describe, expect, it } from "vitest";
import { availableActions } from "./available";

describe("availableActions", () => {
  const cases: [string, string, string | null, string[]][] = [
    ["queued", "requested", null, ["accept", "ask", "merge", "decline", "newDate"]],
    ["in progress", "in_progress", null, ["ask", "merge", "decline", "newDate"]],
    [
      "in progress after a delay notice",
      "in_progress",
      "2026-10-02",
      ["ask", "merge", "decline", "resend"],
    ],
    ["waiting for a reply", "needs_input", null, ["decline", "resend"]],
    ["merged", "merged", null, ["decline"]],
    ["ready", "ready", null, ["resend"]],
    ["declined", "declined", null, ["resend"]],
    ["cancelled", "cancelled", null, []],
  ];

  it.each(cases)("%s", (_name, status, delay, expected) => {
    const result = availableActions({ status, delayNotifiedAt: delay });
    const on = Object.entries(result)
      .filter(([, value]) => value)
      .map(([key]) => key)
      .sort();
    expect(on).toEqual([...expected].sort());
  });
});
