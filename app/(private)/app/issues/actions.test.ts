import { beforeEach, describe, expect, it, vi } from "vitest";
import { ISSUE_COPY } from "@/lib/issues/copy";

const state = vi.hoisted(() => ({
  signedIn: true,
  rpcCalls: [] as { name: string; args: Record<string, unknown> }[],
  rpcError: null as { message: string } | null,
  uploaded: [] as string[],
  deleted: [] as string[],
}));

vi.mock("@/lib/auth/require-session", () => ({
  requireAuthenticatedClient: async () =>
    state.signedIn
      ? {
          user: { id: "user-1" },
          supabase: {
            rpc: async (name: string, args: Record<string, unknown>) => {
              state.rpcCalls.push({ name, args });
              return { data: null, error: state.rpcError };
            },
          },
        }
      : { error: "Log in to continue." },
}));

vi.mock("@/lib/issues/storage", () => ({
  screenshotKey: (userId: string, id: string) => `${userId}/${id}.webp`,
  uploadScreenshot: async (key: string) => void state.uploaded.push(key),
  deleteScreenshot: async (key: string) => void state.deleted.push(key),
}));

const { submitIssueReport } = await import("./actions");

const WEBP = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 data");
const PNG = new TextEncoder().encode("\x89PNG\r\n\x1a\n\0\0\0\0data");

function form(fields: Record<string, string>, screenshot?: Uint8Array<ArrayBuffer>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  if (screenshot) data.set("screenshot", new File([screenshot], "s.webp", { type: "image/webp" }));
  return data;
}

const VALID = { kind: "problem", body: "The quiz froze on question three.", pagePath: "/app/quiz" };

beforeEach(() => {
  state.signedIn = true;
  state.rpcCalls = [];
  state.rpcError = null;
  state.uploaded = [];
  state.deleted = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("submitIssueReport", () => {
  it("saves a report without a screenshot", async () => {
    expect(await submitIssueReport(form(VALID))).toEqual({ ok: true });
    expect(state.uploaded).toEqual([]);
    expect(state.rpcCalls[0]).toMatchObject({
      name: "submit_issue_report",
      args: { p_kind: "problem", p_page_path: "/app/quiz", p_screenshot_path: undefined },
    });
  });

  it("uploads the screenshot under the person's folder before saving", async () => {
    await submitIssueReport(form(VALID, WEBP));
    const key = state.uploaded[0];
    expect(key).toMatch(/^user-1\/[0-9a-f-]{36}\.webp$/);
    expect(state.rpcCalls[0].args).toMatchObject({
      p_screenshot_path: key,
      p_id: key.slice("user-1/".length, -".webp".length),
    });
  });

  it("removes the uploaded screenshot when the report isn't saved", async () => {
    state.rpcError = { message: "issue_quota_reached" };
    const result = await submitIssueReport(form(VALID, WEBP));
    expect(result).toEqual({ ok: false, error: ISSUE_COPY.quotaReached });
    expect(state.deleted).toEqual(state.uploaded);
  });

  it("rejects anything that isn't WebP", async () => {
    const result = await submitIssueReport(form(VALID, PNG));
    expect(result).toEqual({ ok: false, error: ISSUE_COPY.screenshotUnsupported });
    expect(state.uploaded).toEqual([]);
    expect(state.rpcCalls).toEqual([]);
  });

  it("rejects short text and unknown kinds before touching anything", async () => {
    expect((await submitIssueReport(form({ kind: "problem", body: "short" }))).ok).toBe(false);
    expect((await submitIssueReport(form({ ...VALID, kind: "bug" }))).ok).toBe(false);
    expect(state.rpcCalls).toEqual([]);
  });

  it("needs a session", async () => {
    state.signedIn = false;
    expect(await submitIssueReport(form(VALID))).toEqual({
      ok: false,
      error: "Log in to continue.",
    });
  });

  it("hides unexpected database errors behind a retry message", async () => {
    state.rpcError = { message: "connection reset" };
    expect(await submitIssueReport(form(VALID))).toEqual({ ok: false, error: ISSUE_COPY.failed });
  });
});
