import { describe, expect, it, vi } from "vitest";
import { writeAudit } from "./audit";

vi.spyOn(console, "error").mockImplementation(() => undefined);

describe("writeAudit", () => {
  it("calls the audit function with the entry", async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    const ok = await writeAudit({ rpc } as never, {
      action: "app.collection_slug",
      targetType: "collection",
      targetId: "d1",
      details: { old: "a", new: "b" },
    });
    expect(ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("admin_write_audit", {
      p_action: "app.collection_slug",
      p_target_type: "collection",
      p_target_id: "d1",
      p_details: { old: "a", new: "b" },
    });
  });

  it("leaves absent parts undefined and sends empty details", async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    await writeAudit({ rpc } as never, { action: "app.invite_resend" });
    expect(rpc).toHaveBeenCalledWith("admin_write_audit", {
      p_action: "app.invite_resend",
      p_target_type: undefined,
      p_target_id: undefined,
      p_details: {},
    });
  });

  it("returns false, without throwing, when the call fails or resolves an error", async () => {
    expect(
      await writeAudit({ rpc: async () => ({ error: new Error("x") }) } as never, {
        action: "app.invite_resend",
      }),
    ).toBe(false);
    expect(
      await writeAudit(
        {
          rpc: () => {
            throw new Error("no rpc");
          },
        } as never,
        { action: "app.invite_resend" },
      ),
    ).toBe(false);
    expect(await writeAudit({} as never, { action: "app.invite_resend" })).toBe(false);
  });
});
