import { defineConfig, devices } from "@playwright/test";
import { APP_URL, STUB_PORT, appEnv, loadSupabaseEnv } from "./e2e/support/env";

const CI = Boolean(process.env.CI);
const supabase = loadSupabaseEnv();
const env = appEnv(supabase);

// The workers and the app share these values through the environment.
Object.assign(process.env, {
  E2E_SUPABASE_URL: supabase.url,
  E2E_DB_URL: supabase.dbUrl,
  E2E_SUPABASE_PUBLISHABLE_KEY: supabase.publishableKey,
  E2E_SUPABASE_SERVICE_ROLE_KEY: supabase.serviceRoleKey,
  E2E_SUPABASE_S3_ENDPOINT: supabase.s3.endpoint,
  E2E_SUPABASE_S3_REGION: supabase.s3.region,
  E2E_SUPABASE_S3_ACCESS_KEY_ID: supabase.s3.accessKeyId,
  E2E_SUPABASE_S3_SECRET_ACCESS_KEY: supabase.s3.secretAccessKey,
});

const buildAndStart = [
  process.env.E2E_SKIP_BUILD ? "true" : "pnpm exec next build",
  "pnpm exec next start -H 127.0.0.1 -p 3100",
].join(" && ");

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/*.spec.ts", "**/*.setup.ts"],
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI ? [["blob"], ["github"]] : [["list"], ["html", { open: "never" }]],
  expect: { timeout: 10_000 },
  use: {
    baseURL: APP_URL,
    locale: "en-US",
    timezoneId: "UTC",
    serviceWorkers: "block",
    reducedMotion: "reduce",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      testMatch: /.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    {
      name: "mobile",
      testMatch: /.*\.spec\.ts/,
      grep: /@smoke/,
      use: { ...devices["Pixel 7"] },
      dependencies: ["setup"],
    },
  ],
  webServer: [
    {
      command: "node e2e/stubs/server.mts",
      url: `http://127.0.0.1:${STUB_PORT}/__stub/health`,
      reuseExistingServer: !CI,
      env: { STUB_PORT: String(STUB_PORT) },
    },
    {
      command: buildAndStart,
      url: APP_URL,
      reuseExistingServer: !CI,
      timeout: 420_000,
      env,
    },
  ],
});
