"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { exactEmailPattern } from "@/lib/ai-credits/email-lookup";
import {
  creditSettingsSchema,
  grantCreditsSchema,
  type CreditSettingsInput,
} from "@/lib/ai-credits/settings-schema";
import { requireAdminClient } from "@/lib/auth/require-session";
import type { Database } from "@/lib/supabase/database.types";

/** Expected failures come back as text, because Next replaces the message of a
 *  thrown server action with a generic one in production. */
type AdminActionResult = { error?: string };

const GENERIC_ERROR = "Something went wrong. Try again.";

async function runAdminAction(
  work: (supabase: SupabaseClient<Database>) => Promise<AdminActionResult | void>,
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdminClient();
    const result = await work(supabase);
    if (result?.error) return result;

    revalidatePath("/admin/ai-credits");
    return {};
  } catch (err) {
    console.error("AI credits admin action failed:", err);
    return { error: GENERIC_ERROR };
  }
}

export async function setAiCreditsEnabled(value: boolean): Promise<AdminActionResult> {
  return runAdminAction(async (supabase) => {
    const { error } = await supabase
      .from("ai_credit_settings")
      .update({ enabled: value })
      .eq("id", true);
    if (error) throw error;
  });
}

export async function saveAiCreditSettings(input: CreditSettingsInput): Promise<AdminActionResult> {
  return runAdminAction(async (supabase) => {
    const parsed = creditSettingsSchema.safeParse(input);
    if (!parsed.success) return { error: "Check the numbers and try again." };

    const { error } = await supabase
      .from("ai_credit_settings")
      .update({
        default_allowance: parsed.data.defaultAllowance,
        monthly_refill: parsed.data.monthlyRefill,
        quiz_credits_per_question: parsed.data.quizCreditsPerQuestion,
        story_credits_per_term: parsed.data.storyCreditsPerTerm,
      })
      .eq("id", true);
    if (error) throw error;
  });
}

export async function grantAiCredits(input: {
  email: string;
  amount: number;
  note?: string;
}): Promise<AdminActionResult> {
  return runAdminAction(async (supabase) => {
    const parsed = grantCreditsSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details." };

    const { data: account, error: lookupError } = await supabase
      .from("users")
      .select("id")
      .ilike("email", exactEmailPattern(parsed.data.email))
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!account) return { error: "No account found for that email." };

    const { error } = await supabase.rpc("admin_grant_ai_credits", {
      p_user_id: account.id,
      p_amount: parsed.data.amount,
      p_note: parsed.data.note ?? "",
    });
    if (error) throw error;
  });
}

export async function resetAiCredits(userId: string): Promise<AdminActionResult> {
  return runAdminAction(async (supabase) => {
    const { error } = await supabase.rpc("admin_reset_ai_credits", {
      p_user_id: userId,
      p_note: "",
    });
    if (error) throw error;
  });
}
