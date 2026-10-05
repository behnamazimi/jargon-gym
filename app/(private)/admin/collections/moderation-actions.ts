"use server";

import { z } from "zod";
import { AdminError } from "@/lib/admin/admin-error";
import { runAdminAction } from "@/lib/admin/action";
import { findActable } from "@/lib/admin/collections/find-actable";
import { throwRpcError } from "@/lib/admin/rpc-error";
import { REPORT_REASONS, TAKEDOWN_NOTE_MAX } from "@/lib/collections/moderation";

const MODERATION_REVALIDATE = [
  "/admin/collections",
  "/admin/collections/[id]",
  "/admin",
  "/app/browse",
];

const idSchema = z.guid();
const stopSchema = z.object({
  domainId: idSchema,
  reason: z.enum(REPORT_REASONS),
  note: z.string().trim().min(1).max(TAKEDOWN_NOTE_MAX),
});

/** Unshares the collection, removes it from other libraries and locks sharing until an admin lifts it. */
export async function stopSharingCollection(input: unknown) {
  return runAdminAction(
    async ({ supabase, user }) => {
      const parsed = stopSchema.safeParse(input);
      if (!parsed.success) {
        throw new AdminError("Choose a reason and write a note of up to 200 characters.");
      }
      await findActable(supabase, user.id, parsed.data.domainId);

      const { error } = await supabase.rpc("admin_stop_sharing_collection", {
        p_domain_id: parsed.data.domainId,
        p_reason: parsed.data.reason,
        p_note: parsed.data.note,
      });
      if (error) throwRpcError(error);
    },
    { revalidate: MODERATION_REVALIDATE },
  );
}

/** Lets the owner share the collection again. Nothing is restored. */
export async function liftShareLock(domainId: string, note: string) {
  return runAdminAction(
    async ({ supabase, user }) => {
      const id = idSchema.parse(domainId);
      await findActable(supabase, user.id, id);

      const { error } = await supabase.rpc("admin_lift_share_lock", {
        p_domain_id: id,
        p_note: z.string().trim().max(TAKEDOWN_NOTE_MAX).parse(note),
      });
      if (error) throwRpcError(error);
    },
    { revalidate: MODERATION_REVALIDATE },
  );
}

export async function dismissCollectionReports(domainId: string) {
  return runAdminAction(
    async ({ supabase, user }) => {
      const id = idSchema.parse(domainId);
      await findActable(supabase, user.id, id);

      const { error } = await supabase.rpc("admin_dismiss_collection_reports", {
        p_domain_id: id,
      });
      if (error) throwRpcError(error);
    },
    { revalidate: MODERATION_REVALIDATE },
  );
}

/** Who reported it and why, for the Reports dialog. A read: nothing is saved. */
export async function listCollectionReports(domainId: string) {
  return runAdminAction(async ({ supabase, user }) => {
    const id = idSchema.parse(domainId);
    await findActable(supabase, user.id, id);

    const { data, error } = await supabase.rpc("admin_list_collection_reports", {
      p_domain_id: id,
    });
    if (error) throwRpcError(error);
    return (data ?? []).map((row) => ({
      id: row.id,
      reason: row.reason,
      note: row.note,
      reporterEmail: (row.reporter_email as string | null) ?? null,
      createdAt: row.created_at,
      status: row.status,
    }));
  });
}
