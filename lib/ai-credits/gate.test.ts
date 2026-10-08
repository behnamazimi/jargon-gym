import { describe, expect, it } from "vitest";
import { creditGate, isExhausted } from "./gate";

describe("creditGate", () => {
  it("offers the free top-up when it is available", () => {
    expect(creditGate({ available: true, amount: 30 })).toEqual({ kind: "top-up", amount: 30 });
  });

  it("says to come back tomorrow after today's top-up", () => {
    expect(creditGate({ available: false, reason: "already-today", amount: 30 })).toEqual({
      kind: "tomorrow",
    });
  });

  it("offers nothing when the top-up is off or not needed", () => {
    expect(creditGate({ available: false, reason: "balance", amount: 30 })).toEqual({
      kind: "short",
    });
    expect(creditGate({ available: false, reason: "off", amount: 0 })).toEqual({ kind: "short" });
    expect(creditGate(undefined)).toEqual({ kind: "short" });
  });
});

describe("isExhausted", () => {
  it("is true only when credits ran out", () => {
    expect(isExhausted({ kind: "unavailable", reason: "exhausted" })).toBe(true);
    expect(isExhausted({ kind: "unavailable", reason: "none" })).toBe(false);
  });
});
