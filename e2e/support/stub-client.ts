import { STUB_URL } from "./env";

export const LLM_FAIL_MARKER = "E2E_FAIL";

export type SentEmail = { to: string[]; subject: string; text: string; html: string };

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${STUB_URL}/__stub${path}`);
  return (await response.json()) as T;
}

/** What the stub received. Scope assertions to your own user's email, as workers share one stub. */
export const stub = {
  outbox: () => get<SentEmail[]>("/outbox"),
  requests: () => get<{ service: string; path: string }[]>("/requests"),
};
