"use server";

import { revalidatePath } from "next/cache";
import { exactEmailPattern } from "@/lib/ai-credits/email-lookup";
import { requireAdminClient } from "@/lib/auth/require-session";
import {
  creditSettingsSchema,
  grantCreditsSchema,
  type CreditSettingsInput,
} from "@/lib/ai-credits/settings-schema";

export async function setAiCreditsEnabled(value: boolean): Promise<void> {
  const { supabase } = await requireAdminClient();

  const { error } = await supabase
    .from("ai_credit_settings")
    .update({ enabled: value })
    .eq("id", true);
  if (error) throw error;

  revalidatePath("/admin/ai-credits");
}

export async function saveAiCreditSettings(input: CreditSettingsInput): Promise<void> {
  const { supabase } = await requireAdminClient();

  const parsed = creditSettingsSchema.safeParse(input);
  if (!parsed.success) throw new Error("Check the numbers and try again.");

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

  revalidatePath("/admin/ai-credits");
}

export async function grantAiCredits(input: {
  email: string;
  amount: number;
  note?: string;
}): Promise<void> {
  const { supabase } = await requireAdminClient();

  const parsed = grantCreditsSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the details.");

  const { data: account, error: lookupError } = await supabase
    .from("users")
    .select("id")
    .ilike("email", exactEmailPattern(parsed.data.email))
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!account) throw new Error("No account found for that email.");

  const { error } = await supabase.rpc("admin_grant_ai_credits", {
    p_user_id: account.id,
    p_amount: parsed.data.amount,
    p_note: parsed.data.note ?? "",
  });
  if (error) throw error;

  revalidatePath("/admin/ai-credits");
}

export async function resetAiCredits(userId: string): Promise<void> {
  const { supabase } = await requireAdminClient();

  const { error } = await supabase.rpc("admin_reset_ai_credits", {
    p_user_id: userId,
    p_note: "",
  });
  if (error) throw error;

  revalidatePath("/admin/ai-credits");
}
