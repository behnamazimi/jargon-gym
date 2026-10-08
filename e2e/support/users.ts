import { randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import type { BrowserContext } from "@playwright/test";
import { authAdmin, sql } from "./db";
import { loadSupabaseEnv } from "./env";

// Letters and digits, as the password policy requires.
const newPassword = () => `e2e${randomUUID().replace(/-/g, "")}`;

export type TestUser = { id: string; email: string; password: string };

/** A single-use invite code, as signup requires one. Seeded codes only work once per reset. */
export async function createReferralCode(): Promise<string> {
  const code = `E2E${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  await sql("insert into public.referral_codes (code, is_active) values ($1, true)", [code]);
  return code;
}

type CreateUserOptions = { admin?: boolean; tour?: boolean };

/** A confirmed, invite-verified member with their own data. Skips the product tour by default. */
export async function createUser({
  admin = false,
  tour = false,
}: CreateUserOptions = {}): Promise<TestUser> {
  const code = await createReferralCode();
  const email = `e2e-${randomUUID()}@lobyas.test`;
  const password = newPassword();
  const created = await authAdmin().createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { referral_code: code },
  });
  if (created.error) throw new Error(created.error.message);
  const id = created.data.user.id;

  if (admin) await sql("update public.users set role = 'admin' where id = $1", [id]);
  if (!tour) {
    await sql(
      `insert into public.user_settings (user_id, tour_status) values ($1, 'done')
       on conflict (user_id) do update set tour_status = 'done'`,
      [id],
    );
  }
  return { id, email, password };
}

/** Signs in through Supabase and hands the session to the browser the way the app's own client stores it. */
export async function signInContext(context: BrowserContext, user: TestUser): Promise<void> {
  const env = loadSupabaseEnv();
  const jar = new Map<string, string>();
  const client = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw new Error(error.message);

  await context.addCookies(
    [...jar].map(([name, value]) => ({ name, value, url: "http://127.0.0.1:3100" })),
  );
}
