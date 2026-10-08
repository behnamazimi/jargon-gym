import { execFileSync } from "node:child_process";

export const APP_URL = "http://127.0.0.1:3100";
export const STUB_PORT = 3199;
export const STUB_URL = `http://127.0.0.1:${STUB_PORT}`;

export type SupabaseEnv = {
  url: string;
  dbUrl: string;
  publishableKey: string;
  serviceRoleKey: string;
  s3: { endpoint: string; region: string; accessKeyId: string; secretAccessKey: string };
};

function fromCli(): Record<string, string> {
  const output = execFileSync("pnpm", ["-s", "supabase", "status", "-o", "env"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const values: Record<string, string> = {};
  for (const line of output.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (match) values[match[1]!] = match[2]!;
  }
  return values;
}

/** Local Supabase credentials: from E2E_* variables (CI), else from the running local stack. */
export function loadSupabaseEnv(): SupabaseEnv {
  const e = process.env;
  if (e.E2E_SUPABASE_URL && e.E2E_SUPABASE_PUBLISHABLE_KEY && e.E2E_SUPABASE_SERVICE_ROLE_KEY) {
    return {
      url: e.E2E_SUPABASE_URL,
      dbUrl: e.E2E_DB_URL ?? fromCli().DB_URL!,
      publishableKey: e.E2E_SUPABASE_PUBLISHABLE_KEY,
      serviceRoleKey: e.E2E_SUPABASE_SERVICE_ROLE_KEY,
      s3: {
        endpoint: e.E2E_SUPABASE_S3_ENDPOINT ?? `${e.E2E_SUPABASE_URL}/storage/v1/s3`,
        region: e.E2E_SUPABASE_S3_REGION ?? "local",
        accessKeyId: e.E2E_SUPABASE_S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: e.E2E_SUPABASE_S3_SECRET_ACCESS_KEY ?? "",
      },
    };
  }
  const status = fromCli();
  return {
    url: status.API_URL!,
    dbUrl: status.DB_URL!,
    publishableKey: status.PUBLISHABLE_KEY ?? status.ANON_KEY!,
    serviceRoleKey: status.SERVICE_ROLE_KEY!,
    s3: {
      endpoint: status.STORAGE_S3_URL!,
      region: status.S3_PROTOCOL_REGION ?? "local",
      accessKeyId: status.S3_PROTOCOL_ACCESS_KEY_ID!,
      secretAccessKey: status.S3_PROTOCOL_ACCESS_KEY_SECRET!,
    },
  };
}

/** Everything the app under test needs, pointing third parties at the stub. */
export function appEnv(supabase: SupabaseEnv): Record<string, string> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: supabase.url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabase.publishableKey,
    SUPABASE_SERVICE_ROLE_KEY: supabase.serviceRoleKey,
    APP_BASE_URL: APP_URL,
    CENTRAL_LLM_API_KEY: "e2e-key",
    CENTRAL_LLM_PROVIDER: "google",
    LLM_BASE_URL: `${STUB_URL}/v1beta`,
    RESEND_API_KEY: "e2e-key",
    RESEND_BASE_URL: STUB_URL,
    MURF_API_KEY: "e2e-key",
    MURF_BASE_URL: STUB_URL,
    ELEVENLABS_API_KEY: "e2e-key",
    ELEVENLABS_BASE_URL: STUB_URL,
    SUPABASE_S3_ENDPOINT: supabase.s3.endpoint,
    SUPABASE_S3_REGION: supabase.s3.region,
    SUPABASE_S3_ACCESS_KEY_ID: supabase.s3.accessKeyId,
    SUPABASE_S3_SECRET_ACCESS_KEY: supabase.s3.secretAccessKey,
    AI_INTERNAL_SECRET: "e2e-internal",
    NEXT_DIST_DIR: ".next-e2e",
  };
}
