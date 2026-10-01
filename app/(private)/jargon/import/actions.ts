"use server";

import { executeImport } from "@/lib/jargon/import/execute-import";
import { formatImportFailure, ImportExecutionError } from "@/lib/jargon/import/errors";
import { listOwnedCollectionsForImport } from "@/lib/jargon/import/owned-collections";
import { buildImportPreview, parseImportJson } from "@/lib/jargon/import/validate-import";
import type {
  ImportFailure,
  ImportOverrides,
  ImportPreview,
  ImportResult,
} from "@/lib/jargon/import/types";
import { DOMAIN_LANGUAGES, type DomainLanguage } from "@/lib/jargon/languages";
import { pluralize } from "@/lib/utils";
import { z } from "zod";
import { getSessionUser, requireAuthenticatedClient } from "@/lib/auth/require-session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const NOT_SIGNED_IN_FAILURE: ImportFailure = {
  title: "Not signed in",
  message: "Sign in to add terms.",
  hint: "Sign in, then come back to this page.",
};

const overridesSchema = z.object({
  domainName: z.string().trim().min(1).optional(),
  language: z.enum(DOMAIN_LANGUAGES).optional(),
});

function applyOverrides<T extends { domain: string }>(
  data: T,
  overrides: ImportOverrides | undefined,
): { payload: T; language?: DomainLanguage } {
  const parsed = overridesSchema.safeParse(overrides ?? {});
  if (!parsed.success) return { payload: data };

  return {
    payload: parsed.data.domainName ? { ...data, domain: parsed.data.domainName } : data,
    language: parsed.data.language,
  };
}

export async function getImportSetupData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Sign in to add terms." as const };
  }

  const collections = await listOwnedCollectionsForImport(auth.supabase, auth.user.id);

  return { collections };
}

export async function validateImportJson(
  raw: string,
  overrides?: ImportOverrides,
): Promise<{ ok: true; preview: ImportPreview } | { ok: false; failure: ImportFailure }> {
  const parsed = parseImportJson(raw);
  if (!parsed.ok) return parsed;

  const { supabase, user } = await getSessionUser();
  if (!user) {
    return { ok: false, failure: NOT_SIGNED_IN_FAILURE };
  }

  try {
    const { payload } = applyOverrides(parsed.data, overrides);
    const preview = await buildImportPreview(supabase, user.id, payload);
    return { ok: true, preview };
  } catch (err) {
    if (err instanceof ImportExecutionError) {
      return { ok: false, failure: err.failure };
    }

    return {
      ok: false,
      failure: formatImportFailure(err, { step: "Couldn't check the terms" }),
    };
  }
}

function conflictConfirmationFailure(
  conflictingTerms: ImportPreview["conflictingTerms"],
): ImportFailure {
  return {
    title: "Confirm before adding",
    message: `${pluralize(conflictingTerms.length, "term")} already in this collection would be replaced.`,
    details: conflictingTerms,
    hint: "Tick the box in the preview to replace them, then add again.",
  };
}

function handleImportError(err: unknown): { ok: false; failure: ImportFailure } {
  if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
  if (err instanceof ImportExecutionError) {
    return { ok: false, failure: err.failure };
  }

  return {
    ok: false,
    failure: formatImportFailure(err, { step: "Import didn't finish" }),
  };
}

export async function confirmImport(
  raw: string,
  confirmReplace = false,
  overrides?: ImportOverrides,
): Promise<{ ok: true; result: ImportResult } | { ok: false; failure: ImportFailure }> {
  const parsed = parseImportJson(raw);
  if (!parsed.ok) return parsed;

  const { supabase, user } = await getSessionUser();
  if (!user) {
    return { ok: false, failure: NOT_SIGNED_IN_FAILURE };
  }

  try {
    const { payload, language } = applyOverrides(parsed.data, overrides);
    const preview = await buildImportPreview(supabase, user.id, payload);

    if (preview.conflictingTerms.length > 0 && !confirmReplace) {
      return { ok: false, failure: conflictConfirmationFailure(preview.conflictingTerms) };
    }

    const result = await executeImport(supabase, user.id, payload, {
      isMerge: preview.isMerge,
      language,
    });

    revalidatePath("/jargon");
    const imported = result.termsCreated + result.termsUpdated;
    redirect(`/jargon?domain=${result.domainId}&imported=${imported}`);
  } catch (err) {
    return handleImportError(err);
  }
}
