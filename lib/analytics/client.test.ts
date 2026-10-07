import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({
  __loaded: false,
  init: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
}));
vi.mock("posthog-js", () => ({ default: posthog }));

function fakeStorage(entries: Record<string, string>) {
  const store: Record<string, string> = { ...entries };
  Object.defineProperty(store, "removeItem", {
    value: (key: string) => {
      delete store[key];
    },
    enumerable: false,
  });
  return store as unknown as Storage;
}

function stubBrowser(cookie: string, hostname = "app.lobyas.com") {
  const written: string[] = [];
  vi.stubGlobal("document", {
    get cookie() {
      return cookie;
    },
    set cookie(value: string) {
      written.push(value);
    },
  });
  vi.stubGlobal("location", { hostname });
  return written;
}

describe("analytics client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    posthog.__loaded = false;
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "token");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://example.test");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_ENABLED", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("starts PostHog once, and re-enables it instead of initialising twice", async () => {
    stubBrowser("");
    vi.stubGlobal("localStorage", fakeStorage({}));
    vi.stubGlobal("sessionStorage", fakeStorage({}));
    const client = await import("./client");
    client.startAnalytics();
    client.startAnalytics();
    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(client.isAnalyticsRunning()).toBe(true);

    posthog.__loaded = true;
    client.stopAnalytics();
    client.startAnalytics();
    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(posthog.opt_in_capturing).toHaveBeenCalledTimes(1);
  });

  it("does nothing when analytics is switched off for the environment", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_ENABLED", "false");
    vi.stubEnv("NODE_ENV", "development");
    const client = await import("./client");
    client.startAnalytics();
    expect(posthog.init).not.toHaveBeenCalled();
    expect(client.isAnalyticsRunning()).toBe(false);
  });

  it("removes what PostHog saved, even when it was not running on this page", async () => {
    const local = fakeStorage({
      ph_token_posthog: "{}",
      __ph_opt_in_out_token: "1",
      theme: "dark",
    });
    const session = fakeStorage({ ph_session: "x", other: "y" });
    vi.stubGlobal("localStorage", local);
    vi.stubGlobal("sessionStorage", session);
    const written = stubBrowser("ph_token_posthog=abc; lb_consent=denied");

    const client = await import("./client");
    client.stopAnalytics();

    expect(posthog.opt_out_capturing).not.toHaveBeenCalled();
    expect(Object.keys(local)).toEqual(["theme"]);
    expect(Object.keys(session)).toEqual(["other"]);
    expect(written.every((value) => value.startsWith("ph_token_posthog=; Max-Age=0"))).toBe(true);
    expect(written.some((value) => value.includes("Domain=.lobyas.com"))).toBe(true);
  });
});
