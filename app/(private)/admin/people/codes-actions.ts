"use server";

import { z } from "zod";
import { AdminError } from "@/lib/admin/admin-error";
import { runAdminAction } from "@/lib/admin/action";
import { throwRpcError } from "@/lib/admin/rpc-error";

const REVALIDATE = { revalidate: ["/admin/people"] };

const createSchema = z.object({
  code: z.string().trim().min(1),
  label: z.string().trim().min(1).max(60),
  maxUses: z.number().int().min(2).max(10000),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CreateSharedCodeInput = z.input<typeof createSchema>;

/** The campaign ends at the very end of the chosen day, UTC. */
function endOfDay(date: string): string {
  return `${date}T23:59:59.999Z`;
}

export async function createSharedCode(input: CreateSharedCodeInput) {
  return runAdminAction(async ({ supabase }) => {
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) throw new AdminError("Fill in the code, label, seats and end date.");
    const { code, label, maxUses, endDate } = parsed.data;

    const { error } = await supabase.rpc("admin_create_shared_referral_code", {
      p_code: code,
      p_label: label,
      p_max_uses: maxUses,
      p_expires_at: endOfDay(endDate),
    });
    if (error) throwRpcError(error);
  }, REVALIDATE);
}

export async function setSharedCodeActive(id: string, active: boolean) {
  return runAdminAction(async ({ supabase }) => {
    if (!z.string().uuid().safeParse(id).success) throw new AdminError("That code isn't valid.");
    const { error } = await supabase.rpc("admin_set_referral_code_active", {
      p_id: id,
      p_active: active,
    });
    if (error) throwRpcError(error);
  }, REVALIDATE);
}
