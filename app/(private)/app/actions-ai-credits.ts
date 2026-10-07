"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getMyCreditState } from "@/lib/ai-credits/repository";
import { buildTopUpAdminEmail, buildTopUpUserEmail } from "@/lib/ai-credits/topup-copy";
import { getAppOrigin } from "@/lib/auth/app-origin";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { sendRequestEmail } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";

/** The signed-in user's AI credits balance, for the account menus. Null when
 *  credits are off or the lookup fails, so the menus just hide the row. */
export async function getMyAiCreditsAction(): Promise<{ remaining: number } | null> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return null;

  try {
    const state = await getMyCreditState(auth.supabase);
    return state?.enabled ? { remaining: state.remaining } : null;
  } catch (err) {
    console.error("Couldn't load AI credits:", err);
    return null;
  }
}

export type TopUpResult =
  | { ok: true; added: number; remaining: number }
  | { ok: false; reason: "unavailable" | "not-needed" | "failed" };

async function emailTopUp(input: {
  userId: string;
  email: string | undefined;
  added: number;
  remaining: number;
}) {
  const origin = await getAppOrigin();

  if (input.email) {
    await sendRequestEmail({
      to: input.email,
      email: buildTopUpUserEmail({
        added: input.added,
        remaining: input.remaining,
        settingsUrl: `${origin}/app/settings?tab=ai`,
      }),
    });
  }

  const { data: admins, error } = await createAdminClient()
    .from("users")
    .select("email")
    .eq("role", "admin");
  if (error) throw error;
  await sendRequestEmail({
    to: (admins ?? []).map((row) => row.email),
    email: buildTopUpAdminEmail({
      email: input.email ?? input.userId,
      added: input.added,
      remaining: input.remaining,
      adminUrl: `${origin}/admin/people/${input.userId}`,
    }),
  });
}

/** Adds the free top-up to the signed-in user's credits. Payment will replace
 *  this one action, so the screens that offer a top-up don't change. */
export async function topUpAiCreditsAction(): Promise<TopUpResult> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { ok: false, reason: "failed" };

  const { data, error } = await auth.supabase.rpc("my_self_topup_ai_credits");
  if (error) {
    if (error.message.includes("topup_unavailable")) return { ok: false, reason: "unavailable" };
    if (error.message.includes("topup_not_needed")) return { ok: false, reason: "not-needed" };
    console.error("Couldn't top up AI credits:", error);
    return { ok: false, reason: "failed" };
  }

  const row = data?.[0];
  if (!row) return { ok: false, reason: "failed" };

  after(async () => {
    try {
      await emailTopUp({
        userId: auth.user.id,
        email: auth.user.email ?? undefined,
        added: row.added,
        remaining: row.remaining,
      });
    } catch (err) {
      console.error("Couldn't send the top-up emails:", err);
    }
  });

  revalidatePath("/app/settings");
  revalidatePath("/app/quiz");
  revalidatePath("/app/read/stories");
  return { ok: true, added: row.added, remaining: row.remaining };
}
