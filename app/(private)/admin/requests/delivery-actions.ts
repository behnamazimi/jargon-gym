"use server";

import { z } from "zod";
import { AdminError } from "@/lib/admin/admin-error";
import { runAdminAction } from "@/lib/admin/action";
import { writeAudit } from "@/lib/admin/audit";
import { parseId, REVALIDATE, type AdminClient } from "@/lib/admin/requests/action-helpers";
import { notifyRequester } from "@/lib/admin/requests/notify";
import { throwRpcError } from "@/lib/admin/rpc-error";
import { commitTermSchema, linkSchema } from "@/lib/import/commit-schema";

const idSchema = z.string().uuid();

const deliverSchema = z.object({
  requestId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  terms: z.array(commitTermSchema).min(1).max(500),
  links: z.array(linkSchema).max(2000).default([]),
  format: z.enum(["json", "html_table", "anki", "tsv", "csv", "lines", "pairs", "words"]),
});

type Delivery = { request_id: string };

async function emailDeliveries(supabase: AdminClient, deliveries: Delivery[]) {
  const results = await Promise.all(
    deliveries.map((delivery) => notifyRequester(supabase, delivery.request_id, "ready")),
  );
  return {
    delivered: deliveries.length,
    emailFailed: results.filter((result) => result === "failed").length,
  };
}

function asDeliveries(data: unknown): Delivery[] {
  return Array.isArray(data) ? (data as Delivery[]) : [];
}

/** Hands over the collection the admin prepared: a private copy for the requester, and for each merged requester. */
export async function deliverRequest(input: unknown) {
  return runAdminAction(async ({ supabase }) => {
    const parsed = deliverSchema.safeParse(input);
    if (!parsed.success) throw new AdminError("Check the collection name and the terms.");

    const { data, error } = await supabase.rpc("admin_deliver_request", {
      p_request_id: parsed.data.requestId,
      p_name: parsed.data.name,
      p_terms: parsed.data.terms,
      p_relationships: parsed.data.links,
      p_format: parsed.data.format,
    });
    if (error) throwRpcError(error);
    return emailDeliveries(supabase, asDeliveries(data));
  }, REVALIDATE);
}

const fillSchema = z.object({
  requestId: z.string().uuid(),
  terms: z.array(commitTermSchema).min(1).max(500),
});

/** Fills the definitions into the requester's own collection, matching their waiting words by name. */
export async function fillDefinitions(input: unknown) {
  return runAdminAction(async ({ supabase }) => {
    const parsed = fillSchema.safeParse(input);
    if (!parsed.success) throw new AdminError("Check the terms.");

    const { data, error } = await supabase.rpc("admin_fill_definitions", {
      p_request_id: parsed.data.requestId,
      p_terms: parsed.data.terms,
    });
    if (error) throwRpcError(error);
    return emailDeliveries(supabase, asDeliveries(data));
  }, REVALIDATE);
}

/** For a request a Browse collection already answers: adds it to the requester's library. */
export async function addExistingCollection(requestId: string, collectionId: string) {
  return runAdminAction(async ({ supabase }) => {
    const id = parseId(requestId);
    const collection = idSchema.safeParse(collectionId);
    if (!collection.success) throw new AdminError("Pick a collection.");

    const { data, error } = await supabase.rpc("admin_deliver_existing_collection", {
      p_request_id: id,
      p_collection_id: collection.data,
    });
    if (error) throwRpcError(error);
    return emailDeliveries(supabase, asDeliveries(data));
  }, REVALIDATE);
}

/** Sends the email for where the request is now, for when the first one didn't arrive. */
export async function resendRequestEmail(requestId: string) {
  return runAdminAction(async ({ supabase }) => {
    const id = parseId(requestId);
    const { data, error } = await supabase
      .from("collection_requests")
      .select("status, delay_notified_at")
      .eq("id", id)
      .single();
    if (error) throw error;

    const kind =
      data.status === "ready"
        ? "ready"
        : data.status === "needs_input"
          ? "needs_input"
          : data.status === "declined"
            ? "declined"
            : data.delay_notified_at
              ? "delay"
              : null;
    if (!kind) throw new AdminError("There's nothing to resend for this request yet.");

    const result = await notifyRequester(supabase, id, kind);
    if (result === "failed") throw new AdminError("Couldn't send the email. Try again.");
    if (result === "skipped") throw new AdminError("They turned email off for this request.");

    await writeAudit(supabase, {
      action: "app.request_email_resend",
      targetType: "collection_request",
      targetId: id,
    });
  }, REVALIDATE);
}

const settingsSchema = z.object({
  enabled: z.boolean(),
  paused: z.boolean(),
  estimateDays: z.number().int().min(1).max(30),
  pausedEstimateDays: z.number().int().min(1).max(60),
});

export async function saveRequestSettings(input: unknown) {
  return runAdminAction(async ({ supabase }) => {
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) {
      throw new AdminError("Estimates are 1 to 30 days, or up to 60 when slower.");
    }

    const { error } = await supabase
      .from("collection_request_settings")
      .update({
        enabled: parsed.data.enabled,
        paused: parsed.data.paused,
        estimate_days: parsed.data.estimateDays,
        paused_estimate_days: parsed.data.pausedEstimateDays,
      })
      .eq("id", true);
    if (error) throw error;

    await writeAudit(supabase, {
      action: "app.request_settings",
      targetType: "settings",
      details: parsed.data,
    });
  }, REVALIDATE);
}
