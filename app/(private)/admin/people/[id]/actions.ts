"use server";

import { z } from "zod";
import { AdminError } from "@/lib/admin/admin-error";
import { runAdminAction } from "@/lib/admin/action";
import { throwRpcError } from "@/lib/admin/rpc-error";
import { deleteUserScreenshots } from "@/lib/issues/storage";

const REASON_MAX = 200;

const targetSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().trim().min(1, "Give a reason.").max(REASON_MAX, "Keep the reason short."),
});

function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    throw new AdminError(parsed.error.issues[0]?.message ?? "Check the details.");
  return parsed.data;
}

function revalidateFor(userId: string) {
  return { revalidate: ["/admin", "/admin/people", `/admin/people/${userId}`] };
}

/** The person's page is gone afterwards, so refreshing it would show a 404 before the redirect. */
const REVALIDATE_AFTER_DELETE = { revalidate: ["/admin", "/admin/people"] };

export async function setUserSuspended(input: {
  userId: string;
  suspended: boolean;
  reason: string;
}) {
  return runAdminAction(async ({ supabase }) => {
    const { userId, reason } = parse(targetSchema, input);
    const { error } = await supabase.rpc("admin_set_user_suspended", {
      p_user_id: userId,
      p_suspended: input.suspended === true,
      p_reason: reason,
    });
    if (error) throwRpcError(error);
  }, revalidateFor(input.userId));
}

export async function removeUserApiKey(input: { userId: string; reason: string }) {
  return runAdminAction(async ({ supabase }) => {
    const { userId, reason } = parse(targetSchema, input);
    const { error } = await supabase.rpc("admin_remove_user_api_key", {
      p_user_id: userId,
      p_reason: reason,
    });
    if (error) throwRpcError(error);
  }, revalidateFor(input.userId));
}

const deleteSchema = targetSchema.extend({
  confirmEmail: z.string().trim().min(1, "Type their email."),
});

export async function deleteUser(input: { userId: string; reason: string; confirmEmail: string }) {
  return runAdminAction(async ({ supabase }) => {
    const { userId, reason, confirmEmail } = parse(deleteSchema, input);
    const { error } = await supabase.rpc("admin_delete_user", {
      p_user_id: userId,
      p_confirm_email: confirmEmail,
      p_reason: reason,
    });
    if (error) throwRpcError(error);
    await deleteUserScreenshots(userId).catch((err) =>
      console.error("Couldn't remove issue screenshots for a deleted account:", err),
    );
  }, REVALIDATE_AFTER_DELETE);
}
