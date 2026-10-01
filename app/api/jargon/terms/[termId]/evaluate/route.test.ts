import { beforeEach, describe, expect, it, vi } from "vitest";
import { signedUserHeaders } from "@/lib/auth/signed-user-headers";
import { computeTermEvalHash } from "@/lib/jargon/term-eval/content-hash";

const getUserIsAdmin = vi.fn();
const fetchTermCardForUser = vi.fn();
const evaluateTermEntry = vi.fn();
const storedRow = vi.fn();
const upsert = vi.fn();

vi.mock("@/lib/auth/require-session", () => ({ getUserIsAdmin }));
vi.mock("@/lib/trace-queue/hydrate", () => ({ fetchTermCardForUser }));
vi.mock("@/lib/jargon/term-eval/evaluate", () => ({ evaluateTermEntry }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: storedRow }) }),
      upsert,
    }),
  }),
}));

const { POST } = await import("./route");

const TERM_ID = "3f1c2b6e-1111-4222-8333-444455556666";
const ctx = { params: Promise.resolve({ termId: TERM_ID }) };
const card = {
  domainName: "SE",
  term: "Cache",
  category: "Perf",
  definition: "A copy.",
  example: null,
  mentalModel: null,
  discussion: null,
  antiExample: null,
  controversy: null,
};
const currentHash = computeTermEvalHash(card);

const USER_HEADERS = await signedUserHeaders("user-1");

function request() {
  return new Request("http://localhost/x", {
    method: "POST",
    headers: { ...USER_HEADERS },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getUserIsAdmin.mockResolvedValue(true);
  fetchTermCardForUser.mockResolvedValue(card);
  storedRow.mockResolvedValue({ data: null });
  upsert.mockResolvedValue({ error: null });
  evaluateTermEntry.mockResolvedValue({ schemaFit: 0.7, plain: true });
});

describe("term evaluation route", () => {
  it("refuses non-admins before doing anything", async () => {
    getUserIsAdmin.mockResolvedValue(false);
    expect((await POST(request(), ctx)).status).toBe(403);
    expect(fetchTermCardForUser).not.toHaveBeenCalled();
    expect(evaluateTermEntry).not.toHaveBeenCalled();
  });

  it("still requires the term to be visible to the admin", async () => {
    fetchTermCardForUser.mockResolvedValue(null);
    expect((await POST(request(), ctx)).status).toBe(404);
    expect(evaluateTermEntry).not.toHaveBeenCalled();
  });

  it("serves the stored score without calling the model when the hash matches", async () => {
    storedRow.mockResolvedValue({
      data: { schema_fit: 0.9, plain: false, content_hash: currentHash },
    });
    const res = await POST(request(), ctx);
    expect(await res.json()).toEqual({ schemaFit: 0.9, plain: false });
    expect(evaluateTermEntry).not.toHaveBeenCalled();
  });

  it("calls the model and stores the result when the hash differs", async () => {
    storedRow.mockResolvedValue({ data: { schema_fit: 0.1, plain: false, content_hash: "old" } });
    const res = await POST(request(), ctx);
    expect(await res.json()).toEqual({ schemaFit: 0.7, plain: true });
    expect(evaluateTermEntry).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalled();
  });
});
