"use server";

import { z } from "zod";
import { AdminError } from "@/lib/admin/admin-error";
import { runAdminAction } from "@/lib/admin/action";
import { exactEmailPattern } from "@/lib/admin/email-lookup";
import {
  creditSettingsSchema,
  grantCreditsSchema,
  type CreditSettingsInput,
} from "@/lib/ai-credits/settings-schema";

const REVALIDATE = { revalidate: ["/admin/ai-credits"] };

export async function setAiCreditsEnabled(value: boolean) {
  return runAdminAction(async ({ supabase }) => {
    const { error } = await supabase
      .from("ai_credit_settings")
      .update({ enabled: value })
      .eq("id", true);
    if (error) throw error;
  }, REVALIDATE);
}

const featureSwitchSchema = z.object({ feature: z.enum(["quiz", "story"]), value: z.boolean() });

/** Switches a feature on or off for everyone, including people with their own
 *  key. Only `enabled` is written; the update needs the signed-in admin's own
 *  client, since the server role can't change these rows. */
export async function setAiFeatureEnabled(feature: string, value: boolean) {
  return runAdminAction(async ({ supabase }) => {
    const parsed = featureSwitchSchema.safeParse({ feature, value });
    if (!parsed.success) throw new AdminError("Unknown feature.");

    const { data, error } = await supabase
      .from("ai_feature_settings")
      .update({ enabled: parsed.data.value })
      .eq("feature", parsed.data.feature)
      .select("feature");
    if (error) throw error;
    if (!data || data.length !== 1) throw new AdminError("Couldn't change that switch.");
  }, REVALIDATE);
}

export async function saveAiCreditSettings(input: CreditSettingsInput) {
  return runAdminAction(async ({ supabase }) => {
    const parsed = creditSettingsSchema.safeParse(input);
    if (!parsed.success) throw new AdminError("Check the numbers and try again.");

    const { error } = await supabase.rpc("admin_set_ai_credit_settings", {
      p_default_allowance: parsed.data.defaultAllowance,
      p_monthly_refill: parsed.data.monthlyRefill,
      p_quiz_cost: parsed.data.quizCreditsPerQuestion,
      p_story_cost: parsed.data.storyCreditsPerTerm,
    });
    if (error) throw error;
  }, REVALIDATE);
}

export async function grantAiCredits(input: { email: string; amount: number; note?: string }) {
  return runAdminAction(async ({ supabase }) => {
    const parsed = grantCreditsSchema.safeParse(input);
    if (!parsed.success) {
      throw new AdminError(parsed.error.issues[0]?.message ?? "Check the details.");
    }

    const { data: account, error: lookupError } = await supabase
      .from("users")
      .select("id")
      .ilike("email", exactEmailPattern(parsed.data.email))
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!account) throw new AdminError("No account found for that email.");

    const { error } = await supabase.rpc("admin_grant_ai_credits", {
      p_user_id: account.id,
      p_amount: parsed.data.amount,
      p_note: parsed.data.note ?? "",
    });
    if (error) throw error;
  }, REVALIDATE);
}

export async function resetAiCredits(userId: string) {
  return runAdminAction(async ({ supabase }) => {
    const { error } = await supabase.rpc("admin_reset_ai_credits", {
      p_user_id: userId,
      p_note: "",
    });
    if (error) throw error;
  }, REVALIDATE);
}
