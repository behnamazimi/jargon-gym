import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminError } from "./admin-error";

const state = vi.hoisted(() => ({ admin: true, revalidated: [] as string[] }));

vi.mock("next/cache", () => ({ revalidatePath: (path: string) => state.revalidated.push(path) }));
vi.mock("@/lib/auth/require-session", async () => {
  const { AdminError } = await import("./admin-error");
  return {
    requireAdminClient: async () => {
      if (!state.admin) throw new AdminError("Admins only.");
      return { supabase: {}, user: { id: "admin-1" } };
    },
  };
});

const { runAdminAction } = await import("./action");

const GENERIC = "Something went wrong. Try again.";

beforeEach(() => {
  state.admin = true;
  state.revalidated = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("runAdminAction", () => {
  it("returns the data and revalidates after success", async () => {
    const result = await runAdminAction(async () => 42, { revalidate: ["/admin/x"] });
    expect(result).toEqual({ ok: true, data: 42 });
    expect(state.revalidated).toEqual(["/admin/x"]);
  });

  it("passes an AdminError message through and does not revalidate", async () => {
    const result = await runAdminAction(
      async () => {
        throw new AdminError("No account found for that email.");
      },
      { revalidate: ["/admin/x"] },
    );
    expect(result).toEqual({ ok: false, error: "No account found for that email." });
    expect(state.revalidated).toEqual([]);
  });

  it("hides the message of any other error and logs it", async () => {
    const plain = await runAdminAction(async () => {
      throw new Error("relation admin_secrets does not exist");
    });
    const postgrest = await runAdminAction(async () => {
      throw { code: "42P01", message: "relation admin_secrets does not exist" };
    });
    expect(plain).toEqual({ ok: false, error: GENERIC });
    expect(postgrest).toEqual({ ok: false, error: GENERIC });
    expect(console.error).toHaveBeenCalledTimes(2);
  });

  it("keeps non-admins out without running the work", async () => {
    state.admin = false;
    const work = vi.fn(async () => 1);
    expect(await runAdminAction(work)).toEqual({ ok: false, error: "Admins only." });
    expect(work).not.toHaveBeenCalled();
  });
});
