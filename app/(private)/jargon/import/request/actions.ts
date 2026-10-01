"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { getAppOrigin } from "@/lib/auth/app-origin";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { sendRequestEmail } from "@/lib/email/resend";
import { REQUEST_COPY } from "@/lib/requests/copy";
import { buildAdminNoticeEmail } from "@/lib/requests/email-copy";
import { blockedMessage, entryFor } from "@/lib/requests/entry";
import { failureFor } from "@/lib/requests/failures";
import { normalizeKnownTerms } from "@/lib/requests/known-terms";
import { fetchRequestQuota } from "@/lib/requests/repository";
import { requestFormSchema } from "@/lib/requests/schema";
import { getStudyPhoneUserSettings } from "@/lib/streak/settings";
import { DOMAIN_LANGUAGE_OPTIONS } from "@/lib/jargon/languages";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateRequestResult =
  | { ok: true; id: string; topic: string; estimateDays: number }
  | { ok: false; message: string };

const DAY_MS = 24 * 60 * 60 * 1000;

async function notifyTeam(topic: string, kind: string, language: string) {
  const admin = createAdminClient();
  const { data: admins, error } = await admin.from("users").select("email").eq("role", "admin");
  if (error) throw error;

  const to = (admins ?? []).map((row) => row.email);
  if (to.length === 0) return;

  const origin = await getAppOrigin();
  await sendRequestEmail({
    to,
    email: buildAdminNoticeEmail({
      topic,
      kindLabel: kind === "vocabulary" ? "Vocabulary" : "Jargon",
      languageLabel: DOMAIN_LANGUAGE_OPTIONS.find((o) => o.value === language)?.label ?? language,
      adminUrl: `${origin}/admin/requests`,
    }),
  });
}

type Auth = Exclude<Awaited<ReturnType<typeof requireAuthenticatedClient>>, { error: string }>;

/** An open request or a used-up quota gets the specific sentence; everything else is general. */
async function explainFailure(auth: Auth, error: { message?: string } | null): Promise<string> {
  const failure = failureFor(error);
  if (failure.code === "closed") return REQUEST_COPY.form.closed;
  if (failure.code === "open_exists" || failure.code === "quota") {
    try {
      const { timezone } = await getStudyPhoneUserSettings(auth.user.id);
      const message = blockedMessage(entryFor(await fetchRequestQuota(auth.supabase), timezone));
      if (message) return message;
    } catch {
      // Fall through to the general message.
    }
  }
  return REQUEST_COPY.form.sendFailed;
}

type CreateArgs = {
  p_topic: string;
  p_kind: string;
  p_language: string;
  p_level?: string;
  p_size?: number;
  p_known_terms?: string;
  p_notify_email: boolean;
  p_target_domain_id?: string;
};

async function sendRequest(auth: Auth, args: CreateArgs): Promise<CreateRequestResult> {
  const { data: created, error } = await auth.supabase.rpc("my_create_collection_request", args);

  if (error || !created || typeof created !== "object" || Array.isArray(created)) {
    return { ok: false, message: await explainFailure(auth, error) };
  }

  const row = created as { id: string; due_at: string; topic: string };
  revalidatePath("/jargon");

  after(async () => {
    try {
      await notifyTeam(row.topic, args.p_kind, args.p_language);
    } catch (err) {
      console.error("Couldn't email the team about a new collection request:", err);
    }
  });

  return {
    ok: true,
    id: row.id,
    topic: row.topic,
    estimateDays: Math.max(1, Math.round((new Date(row.due_at).getTime() - Date.now()) / DAY_MS)),
  };
}

/** Sends the request. The database enforces the switch, the one-open rule and
 *  the quota; this only turns what it says into plain words. */
export async function createRequest(input: unknown): Promise<CreateRequestResult> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { ok: false, message: REQUEST_COPY.form.signedOut };

  const parsed = requestFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? REQUEST_COPY.form.sendFailed };
  }
  const data = parsed.data;
  const known = normalizeKnownTerms(data.knownTerms);
  if (!known.ok) return { ok: false, message: known.message };

  return sendRequest(auth, {
    p_topic: data.topic,
    p_kind: data.kind,
    p_language: data.language,
    p_level: data.level,
    p_size: data.size,
    p_known_terms: known.value ?? undefined,
    p_notify_email: data.notifyEmail,
  });
}

const definitionsSchema = z.object({
  domainId: z.string().uuid(),
  notifyEmail: z.boolean().default(true),
});

/** Asks for definitions for the words waiting in one of the person's own collections. */
export async function createDefinitionsRequest(input: unknown): Promise<CreateRequestResult> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { ok: false, message: REQUEST_COPY.form.signedOut };

  const parsed = definitionsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: REQUEST_COPY.form.sendFailed };

  const { data: domain } = await auth.supabase
    .from("domains")
    .select("name, language, owner_id")
    .eq("id", parsed.data.domainId)
    .maybeSingle();
  if (!domain || domain.owner_id !== auth.user.id) {
    return { ok: false, message: REQUEST_COPY.definitions.notYours };
  }

  return sendRequest(auth, {
    p_topic: REQUEST_COPY.definitions.topic(domain.name),
    p_kind: "definitions",
    p_language: domain.language,
    p_notify_email: parsed.data.notifyEmail,
    p_target_domain_id: parsed.data.domainId,
  });
}
