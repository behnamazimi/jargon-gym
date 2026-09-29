import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { getNarrationAccessForUser } from "./access";

function clientReturning(result: { data: boolean | null; error: Error | null }) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc } as unknown as SupabaseClient<Database>, rpc };
}

describe("getNarrationAccessForUser", () => {
  it("asks about the term feature by default", async () => {
    const { client, rpc } = clientReturning({ data: true, error: null });
    expect(await getNarrationAccessForUser(client, "u1")).toBe(true);
    expect(rpc).toHaveBeenCalledWith("has_feature_access", {
      p_user_id: "u1",
      p_feature: "narration_term",
    });
  });

  it("asks about the story feature when told to", async () => {
    const { client, rpc } = clientReturning({ data: false, error: null });
    expect(await getNarrationAccessForUser(client, "u1", "narration_story")).toBe(false);
    expect(rpc).toHaveBeenCalledWith("has_feature_access", {
      p_user_id: "u1",
      p_feature: "narration_story",
    });
  });

  it("denies, and logs, when the check fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { client } = clientReturning({ data: null, error: new Error("rpc failed") });
    expect(await getNarrationAccessForUser(client, "u1")).toBe(false);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
