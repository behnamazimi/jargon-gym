import { describe, expect, it } from "vitest";
import { summarizeLedger } from "./refund-snapshot";

const spend = (user: string) => ({ kind: "spend", user_id: user, note: null });
const refund = (user: string, note: string | null = "Provider error 401: bad key") => ({
  kind: "refund",
  user_id: user,
  note,
});

describe("summarizeLedger", () => {
  it("is not high when nothing failed", () => {
    const snapshot = summarizeLedger([spend("a"), spend("b")]);
    expect(snapshot).toMatchObject({ high: false, refunds24h: 0, topReason: null });
  });

  it("is high when many people's requests were refunded", () => {
    const snapshot = summarizeLedger([
      spend("a"),
      refund("a"),
      refund("b"),
      refund("c"),
      refund("c", "Timeout"),
    ]);
    expect(snapshot).toMatchObject({
      high: true,
      spends24h: 1,
      refunds24h: 4,
      refundUsers24h: 3,
      topReason: "Provider error 401: bad key",
    });
  });

  it("is not high when one person keeps failing", () => {
    const snapshot = summarizeLedger([refund("a"), refund("a"), refund("a"), refund("a")]);
    expect(snapshot.high).toBe(false);
  });

  it("names unknown reasons", () => {
    expect(summarizeLedger([refund("a", null)]).topReason).toBe("Unknown reason");
  });
});
