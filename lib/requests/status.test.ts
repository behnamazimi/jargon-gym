import { describe, expect, it } from "vitest";
import { REQUEST_COPY } from "./copy";
import { dueLine, pillFor, statusSentence } from "./status";
import type { DisplayStatus } from "./types";

const STATUSES: DisplayStatus[] = ["requested", "in_progress", "needs_input", "ready", "declined"];

describe("pillFor", () => {
  it.each(STATUSES)("%s", (status) => {
    const pill = pillFor(status);
    if (status === "declined") expect(pill).toBeNull();
    else expect(pill?.label).toBe(REQUEST_COPY.card.pills[status]);
  });

  it("says Being prepared only for work that has started", () => {
    const labels = STATUSES.filter((s) => pillFor(s)?.label === "Being prepared");
    expect(labels).toEqual(["in_progress"]);
  });
});

describe("statusSentence", () => {
  it.each(STATUSES)("%s has a sentence", (status) => {
    expect(statusSentence({ displayStatus: status })).toMatch(/\.$/);
  });
});

describe("dueLine", () => {
  it("gives the estimate", () => {
    expect(dueLine({ dueDate: "Sat 3 Oct", delayNotified: false })).toBe(
      "Usually ready by Sat 3 Oct",
    );
  });

  it("gives the new estimate once a delay notice went out", () => {
    expect(dueLine({ dueDate: "Sat 3 Oct", delayNotified: true })).toBe(
      "Taking a little longer than usual · new estimate Sat 3 Oct",
    );
  });
});
