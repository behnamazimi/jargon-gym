"use server";

import { z } from "zod";
import { AdminError } from "@/lib/admin/admin-error";
import { runAdminAction } from "@/lib/admin/action";
import { writeAudit } from "@/lib/admin/audit";
import {
  emailFailed,
  mergedChildren,
  parseId,
  REVALIDATE,
} from "@/lib/admin/requests/action-helpers";
import { notifyRequester } from "@/lib/admin/requests/notify";
import { DECLINE_REASONS } from "@/lib/requests/types";

const HANDLED = "Request already handled.";
const OPEN = ["requested", "in_progress", "needs_input"];

export async function acceptRequest(requestId: string) {
  return runAdminAction(async ({ supabase }) => {
    const id = parseId(requestId);
    const { data, error } = await supabase
      .from("collection_requests")
      .update({ status: "in_progress", accepted_at: new Date().toISOString(), replied_at: null })
      .eq("id", id)
      .eq("status", "requested")
      .select("id");
    if (error) throw error;
    if (!data?.length) throw new AdminError(HANDLED);

    await writeAudit(supabase, {
      action: "app.request_accept",
      targetType: "collection_request",
      targetId: id,
    });
  }, REVALIDATE);
}

const questionSchema = z.string().trim().min(1).max(500);

export async function askRequest(requestId: string, question: string) {
  return runAdminAction(async ({ supabase }): Promise<{ emailSent: boolean }> => {
    const id = parseId(requestId);
    const parsed = questionSchema.safeParse(question);
    if (!parsed.success) throw new AdminError("Write a question of up to 500 characters.");

    const { data, error } = await supabase
      .from("collection_requests")
      .update({
        status: "needs_input",
        question: parsed.data,
        needs_input_since: new Date().toISOString(),
        user_reply: null,
        replied_at: null,
      })
      .eq("id", id)
      .in("status", ["requested", "in_progress"])
      .select("id");
    if (error) throw error;
    if (!data?.length) throw new AdminError(HANDLED);

    const emailSent = !emailFailed([await notifyRequester(supabase, id, "needs_input")]);
    await writeAudit(supabase, {
      action: "app.request_ask",
      targetType: "collection_request",
      targetId: id,
      details: { emailSent },
    });
    return { emailSent };
  }, REVALIDATE);
}

const declineSchema = z.object({
  reason: z.enum(DECLINE_REASONS),
  note: z.string().trim().max(300).optional(),
});

/** Declines the request and every request merged into it, with one email each. */
export async function declineRequest(requestId: string, reason: string, note?: string) {
  return runAdminAction(async ({ supabase }): Promise<{ declined: number; emailSent: boolean }> => {
    const id = parseId(requestId);
    const parsed = declineSchema.safeParse({ reason, note });
    if (!parsed.success) throw new AdminError("Pick one of the reasons.");

    const children = await mergedChildren(supabase, id);
    const { data, error } = await supabase
      .from("collection_requests")
      .update({
        status: "declined",
        decline_reason: parsed.data.reason,
        decline_note: parsed.data.note || null,
        needs_input_since: null,
      })
      .eq("id", id)
      .in("status", OPEN)
      .select("id");
    if (error) throw error;
    if (!data?.length) throw new AdminError(HANDLED);

    if (children.length > 0) {
      const { error: childError } = await supabase
        .from("collection_requests")
        .update({
          status: "declined",
          decline_reason: parsed.data.reason,
          decline_note: parsed.data.note || null,
          merged_into: null,
        })
        .in("id", children)
        .eq("status", "merged");
      if (childError) throw childError;
    }

    const results = await Promise.all(
      [id, ...children].map((target) => notifyRequester(supabase, target, "declined")),
    );
    const emailSent = !emailFailed(results);
    await writeAudit(supabase, {
      action: "app.request_decline",
      targetType: "collection_request",
      targetId: id,
      details: { reason: parsed.data.reason, merged: children.length, emailSent },
    });
    return { declined: children.length + 1, emailSent };
  }, REVALIDATE);
}

/** Folds this request into another open one: the other's delivery reaches this requester too. */
export async function mergeRequest(requestId: string, targetId: string) {
  return runAdminAction(async ({ supabase }) => {
    const id = parseId(requestId);
    const target = parseId(targetId);
    if (id === target) throw new AdminError("A request can't be merged into itself.");

    const { data: rows, error } = await supabase
      .from("collection_requests")
      .select("id, kind, language, status")
      .in("id", [id, target]);
    if (error) throw error;
    const source = rows?.find((row) => row.id === id);
    const primary = rows?.find((row) => row.id === target);
    if (!source || !OPEN.includes(source.status)) throw new AdminError(HANDLED);
    if (!primary || !["requested", "in_progress"].includes(primary.status)) {
      throw new AdminError("The other request isn't open any more.");
    }
    if (source.kind !== primary.kind || source.language !== primary.language) {
      throw new AdminError("Those two requests are for a different kind or language.");
    }

    const { data: moved, error: moveError } = await supabase
      .from("collection_requests")
      .update({ status: "merged", merged_into: target, needs_input_since: null })
      .eq("id", id)
      .in("status", OPEN)
      .select("id");
    if (moveError) throw moveError;
    if (!moved?.length) throw new AdminError(HANDLED);

    const { error: reparentError } = await supabase
      .from("collection_requests")
      .update({ merged_into: target })
      .eq("merged_into", id)
      .eq("status", "merged");
    if (reparentError) throw reparentError;

    await writeAudit(supabase, {
      action: "app.request_merge",
      targetType: "collection_request",
      targetId: id,
      details: { into: target },
    });
  }, REVALIDATE);
}

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** The one late notice: sets a new estimate, emails it once, and locks. */
export async function setNewDate(requestId: string, date: string) {
  return runAdminAction(async ({ supabase }): Promise<{ emailSent: boolean }> => {
    const id = parseId(requestId);
    const parsed = dateSchema.safeParse(date);
    const due = parsed.success ? new Date(`${parsed.data}T12:00:00Z`) : null;
    if (!due || Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) {
      throw new AdminError("Pick a date in the future.");
    }

    const children = await mergedChildren(supabase, id);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("collection_requests")
      .update({ due_at: due.toISOString(), delay_notified_at: now })
      .eq("id", id)
      .in("status", ["requested", "in_progress"])
      .is("delay_notified_at", null)
      .select("id");
    if (error) throw error;
    if (!data?.length) throw new AdminError("A delay notice was already sent.");

    if (children.length > 0) {
      const { error: childError } = await supabase
        .from("collection_requests")
        .update({ delay_notified_at: now })
        .in("id", children);
      if (childError) throw childError;
    }

    const results = await Promise.all(
      [id, ...children].map((target) => notifyRequester(supabase, target, "delay")),
    );
    const emailSent = !emailFailed(results);
    await writeAudit(supabase, {
      action: "app.request_new_date",
      targetType: "collection_request",
      targetId: id,
      details: { emailSent },
    });
    return { emailSent };
  }, REVALIDATE);
}
