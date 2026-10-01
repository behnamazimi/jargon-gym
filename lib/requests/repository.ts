import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { DOMAIN_LANGUAGES } from "@/lib/jargon/languages";
import { getStudyPhoneUserSettings } from "@/lib/streak/settings";
import { formatRequestDate } from "./dates";
import { entryFor, type RequestEntry } from "./entry";
import {
  DECLINE_REASONS,
  REQUEST_KINDS,
  type DisplayStatus,
  type MyRequest,
  type RequestQuota,
  type RequestStatus,
} from "./types";

type Client = SupabaseClient<Database>;

const quotaSchema = z.object({
  enabled: z.boolean(),
  paused: z.boolean(),
  estimate_days: z.number(),
  used: z.number(),
  limit: z.number(),
  next_available_at: z.string().nullable(),
  open_request_id: z.string().nullable(),
  open_request_topic: z.string().nullable(),
});

export async function fetchRequestQuota(client: Client): Promise<RequestQuota> {
  const { data, error } = await client.rpc("my_collection_request_quota");
  if (error) throw error;
  const quota = quotaSchema.parse(data);
  return {
    enabled: quota.enabled,
    paused: quota.paused,
    estimateDays: quota.estimate_days,
    used: quota.used,
    limit: quota.limit,
    nextAvailableAt: quota.next_available_at,
    openRequestId: quota.open_request_id,
    openRequestTopic: quota.open_request_topic,
  };
}

const KINDS: readonly string[] = [...REQUEST_KINDS, "definitions"];
const REASONS: readonly string[] = DECLINE_REASONS;
const LANGUAGES: readonly string[] = DOMAIN_LANGUAGES;

/** The person's requests that are still worth showing, newest first. Dates are
 *  formatted here, in their time zone, so the page doesn't shift on hydration. */
export async function fetchMyRequests(
  client: Client,
  timeZone: string | null,
): Promise<MyRequest[]> {
  const { data, error } = await client.rpc("my_list_collection_requests");
  if (error) throw error;

  return (data ?? []).flatMap((row): MyRequest[] => {
    if (!KINDS.includes(row.kind) || !LANGUAGES.includes(row.language)) return [];
    return [
      {
        id: row.id,
        topic: row.topic,
        kind: row.kind as MyRequest["kind"],
        language: row.language as MyRequest["language"],
        status: row.status as RequestStatus,
        displayStatus: row.display_status as DisplayStatus,
        dueDate: formatRequestDate(row.display_due_at, timeZone),
        question: row.question,
        declineReason: REASONS.includes(row.decline_reason)
          ? (row.decline_reason as MyRequest["declineReason"])
          : null,
        declineNote: row.decline_note,
        deliveryKind: row.delivery_kind as MyRequest["deliveryKind"],
        deliveredDomainId: row.delivered_domain_id,
        deliveredDomainName: row.delivered_domain_name,
        deliveredTerms: row.delivered_terms,
        delayNotified: row.delay_notified_at !== null,
        notifyEmail: row.notify_email,
        accepted: row.accepted_at !== null,
        createdDate: formatRequestDate(row.created_at, timeZone),
      },
    ];
  });
}

/** Quota and the person's time zone, reduced to what the entry points need. A
 *  failed read hides the request row rather than breaking the page. */
async function loadRequestEntry(client: Client, timeZone: string | null): Promise<RequestEntry> {
  try {
    return entryFor(await fetchRequestQuota(client), timeZone);
  } catch (error) {
    console.error("Couldn't load the request quota:", error);
    return { state: "closed" };
  }
}

/** The same, for the signed-in person: their time zone is looked up here. */
export async function loadRequestEntryFor(client: Client, userId: string): Promise<RequestEntry> {
  let timeZone: string | null = null;
  try {
    timeZone = (await getStudyPhoneUserSettings(userId)).timezone;
  } catch {
    // Dates fall back to UTC.
  }
  return loadRequestEntry(client, timeZone);
}
