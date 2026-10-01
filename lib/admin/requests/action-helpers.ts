import { z } from "zod";
import { AdminError } from "@/lib/admin/admin-error";
import type { NotifyResult } from "@/lib/admin/requests/notify";
import type { requireAdminClient } from "@/lib/auth/require-session";

export type AdminClient = Awaited<ReturnType<typeof requireAdminClient>>["supabase"];

export const REVALIDATE = { revalidate: ["/admin/requests", "/admin/requests/[id]", "/admin"] };

const idSchema = z.string().uuid();

export function parseId(value: unknown): string {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) throw new AdminError("That request isn't valid.");
  return parsed.data;
}

/** Ids of the requests merged into this one, which follow it. */
export async function mergedChildren(supabase: AdminClient, id: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("collection_requests")
    .select("id")
    .eq("merged_into", id)
    .eq("status", "merged");
  if (error) throw error;
  return (data ?? []).map((row) => row.id);
}

export const emailFailed = (results: NotifyResult[]) =>
  results.some((result) => result === "failed");
