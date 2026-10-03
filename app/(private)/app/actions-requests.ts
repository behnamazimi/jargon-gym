"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { failureFor, failureMessage } from "@/lib/requests/failures";
import type { Database } from "@/lib/supabase/database.types";

export type RequestActionResult = { ok: true } | { ok: false; message: string };

const idSchema = z.string().uuid();
const replySchema = z.string().trim().min(1).max(1000);

async function run(
  id: unknown,
  call: (supabase: SupabaseClient<Database>) => PromiseLike<{ error: { message?: string } | null }>,
): Promise<RequestActionResult> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { ok: false, message: failureMessage({ code: "signed_out" }) };
  if (!idSchema.safeParse(id).success) {
    return { ok: false, message: failureMessage({ code: "invalid" }) };
  }

  const { error } = await call(auth.supabase);
  if (error) return { ok: false, message: failureMessage(failureFor(error)) };

  revalidatePath("/app/library");
  return { ok: true };
}

export async function cancelRequest(id: string): Promise<RequestActionResult> {
  return run(id, (supabase) => supabase.rpc("my_cancel_collection_request", { p_id: id }));
}

export async function replyToRequest(id: string, reply: string): Promise<RequestActionResult> {
  const parsed = replySchema.safeParse(reply);
  if (!parsed.success) return { ok: false, message: failureMessage({ code: "invalid" }) };
  return run(id, (supabase) =>
    supabase.rpc("my_reply_collection_request", { p_id: id, p_reply: parsed.data }),
  );
}

export async function dismissRequest(id: string): Promise<RequestActionResult> {
  return run(id, (supabase) => supabase.rpc("my_dismiss_collection_request", { p_id: id }));
}

export async function setRequestNotify(id: string, notify: boolean): Promise<RequestActionResult> {
  return run(id, (supabase) =>
    supabase.rpc("my_set_request_notify", { p_id: id, p_notify: notify }),
  );
}
