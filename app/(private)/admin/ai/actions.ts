"use server";

import { z } from "zod";
import { AdminError } from "@/lib/admin/admin-error";
import { runAdminAction } from "@/lib/admin/action";

const REVALIDATE = { revalidate: ["/admin", "/admin/ai", "/admin/ai/credits"] };

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
