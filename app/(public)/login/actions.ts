"use server";

import { trackServer } from "@/lib/analytics/server";
import { redirect } from "next/navigation";
import { formatLoginError } from "@/lib/auth/format-auth-error";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string } | null;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: formatLoginError(error) };
  }

  trackServer(data.user.id, "user_logged_in", { method: "email" });

  const next = safeNextPath(formData.get("next")?.toString() ?? null);
  redirect(next);
}
