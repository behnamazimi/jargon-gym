import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppOrigin } from "@/lib/auth/app-origin";
import { sendRequestEmail } from "@/lib/email/resend";
import { formatRequestDate } from "@/lib/requests/dates";
import {
  buildDeclinedEmail,
  buildDelayEmail,
  buildNeedsInputEmail,
  buildReadyEmail,
  type RequestEmail,
} from "@/lib/requests/email-copy";
import { DECLINE_REASONS, type DeclineReason } from "@/lib/requests/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type RequestEmailKind = "ready" | "needs_input" | "delay" | "declined";
export type NotifyResult = "sent" | "skipped" | "failed";

type RequestRow = Database["public"]["Tables"]["collection_requests"]["Row"];

async function buildEmail(
  row: RequestRow,
  kind: RequestEmailKind,
  timeZone: string | null,
  domainName: string | null,
): Promise<RequestEmail | null> {
  const origin = await getAppOrigin();
  switch (kind) {
    case "ready":
      return buildReadyEmail({
        topic: row.topic,
        terms: row.delivered_terms ?? 0,
        deliveryKind:
          row.delivery_kind === "added_shared" || row.delivery_kind === "filled"
            ? row.delivery_kind
            : "prepared",
        collectionName: domainName,
        url: row.delivered_domain_id
          ? `${origin}/jargon?domain=${row.delivered_domain_id}`
          : `${origin}/jargon`,
      });
    case "needs_input":
      return row.question
        ? buildNeedsInputEmail({
            topic: row.topic,
            question: row.question,
            url: `${origin}/jargon`,
          })
        : null;
    case "delay":
      return buildDelayEmail({
        topic: row.topic,
        date: formatRequestDate(row.due_at, timeZone),
        url: `${origin}/jargon`,
      });
    case "declined": {
      const reason = (DECLINE_REASONS as readonly string[]).includes(row.decline_reason ?? "")
        ? (row.decline_reason as DeclineReason)
        : null;
      return reason
        ? buildDeclinedEmail({
            topic: row.topic,
            reason,
            note: row.decline_note,
            pasteUrl: `${origin}/jargon/import/paste`,
          })
        : null;
    }
  }
}

/** Emails the requester about their request's current state. It never undoes or
 *  blocks the change it follows: a failure is remembered on the request so the
 *  admin can resend, and the in-app card stays the source of truth. */
export async function notifyRequester(
  client: Client,
  requestId: string,
  kind: RequestEmailKind,
): Promise<NotifyResult> {
  try {
    const { data: row, error } = await client
      .from("collection_requests")
      .select("*")
      .eq("id", requestId)
      .single();
    if (error) throw error;
    if (!row.notify_email) return "skipped";

    const service = createAdminClient();
    const [{ data: user }, { data: settings }, { data: domain }] = await Promise.all([
      service.from("users").select("email").eq("id", row.user_id).maybeSingle(),
      service.from("user_settings").select("timezone").eq("user_id", row.user_id).maybeSingle(),
      row.delivered_domain_id
        ? service.from("domains").select("name").eq("id", row.delivered_domain_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (!user?.email) throw new Error("The requester has no email address.");

    const email = await buildEmail(row, kind, settings?.timezone ?? null, domain?.name ?? null);
    if (!email) return "skipped";

    await sendRequestEmail({ to: user.email, email });
    if (row.email_failed) {
      await client.from("collection_requests").update({ email_failed: false }).eq("id", requestId);
    }
    return "sent";
  } catch (err) {
    console.error(`Request email (${kind}) failed:`, err);
    await client.from("collection_requests").update({ email_failed: true }).eq("id", requestId);
    return "failed";
  }
}
