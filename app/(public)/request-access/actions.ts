"use server";

import { after } from "next/server";
import { z } from "zod";
import { getAppOrigin } from "@/lib/auth/app-origin";
import { getSessionUser } from "@/lib/auth/require-session";
import { sendWaitlistRequestNotification } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type RequestAccessState = { error: string } | { success: true } | null;

const emailSchema = z.string().trim().toLowerCase().email();

function scheduleAdminNotification(email: string): void {
  after(async () => {
    try {
      await notifyAdmins(email);
    } catch (err) {
      console.error("Failed to notify admins of waitlist request:", err);
    }
  });
}

async function resolveRequestEmail(formData: FormData): Promise<string> {
  const { user } = await getSessionUser();
  return user?.email ?? formData.get("email")?.toString() ?? "";
}

async function insertWaitlistRequest(
  email: string,
  normalizedEmail: string,
): Promise<{ failure: string } | { failure: null; isNewRequest: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("waitlist_requests")
    .insert({ email, normalized_email: normalizedEmail });

  if (error && error.code !== "23505") {
    return { failure: "Something went wrong. Try again." };
  }

  return { failure: null, isNewRequest: !error };
}

export async function requestAccess(
  _prev: RequestAccessState,
  formData: FormData,
): Promise<RequestAccessState> {
  const honeypot = formData.get("company")?.toString() ?? "";
  if (honeypot.trim() !== "") {
    return { success: true };
  }

  const rawEmail = await resolveRequestEmail(formData);
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  const email = rawEmail.trim();
  const insertResult = await insertWaitlistRequest(email, parsed.data);
  if (insertResult.failure !== null) {
    return { error: insertResult.failure };
  }

  if (insertResult.isNewRequest) {
    scheduleAdminNotification(email);
  }
  return { success: true };
}

async function notifyAdmins(requesterEmail: string): Promise<void> {
  const admin = createAdminClient();
  const { data: admins, error } = await admin.from("users").select("email").eq("role", "admin");
  if (error) throw error;

  const adminEmails = (admins ?? []).map((row) => row.email);
  if (adminEmails.length === 0) return;

  const origin = await getAppOrigin();
  await sendWaitlistRequestNotification({
    to: adminEmails,
    requesterEmail,
    adminUrl: `${origin}/admin/invites`,
  });
}
