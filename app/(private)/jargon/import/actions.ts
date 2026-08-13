"use server";

import { executeImport } from "@/lib/jargon/import/execute-import";
import { formatImportFailure, ImportExecutionError } from "@/lib/jargon/import/errors";
import { buildImportPreview, parseImportJson } from "@/lib/jargon/import/validate-import";
import type { ImportFailure, ImportPreview, ImportResult } from "@/lib/jargon/import/types";
import { getSessionUser } from "@/lib/auth/require-session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const NOT_SIGNED_IN_FAILURE: ImportFailure = {
  title: "Not signed in",
  message: "Log in to import jargon.",
  hint: "Sign in, then come back to this page.",
};

export async function validateImportJson(
  raw: string,
): Promise<{ ok: true; preview: ImportPreview } | { ok: false; failure: ImportFailure }> {
  const parsed = parseImportJson(raw);
  if (!parsed.ok) return parsed;

  const { supabase, user } = await getSessionUser();
  if (!user) {
    return { ok: false, failure: NOT_SIGNED_IN_FAILURE };
  }

  try {
    const preview = await buildImportPreview(supabase, user.id, parsed.data);
    return { ok: true, preview };
  } catch (err) {
    if (err instanceof ImportExecutionError) {
      return { ok: false, failure: err.failure };
    }

    return {
      ok: false,
      failure: formatImportFailure(err, { step: "Validation failed" }),
    };
  }
}

export async function confirmImport(
  raw: string,
  confirmReplace = false,
): Promise<{ ok: true; result: ImportResult } | { ok: false; failure: ImportFailure }> {
  const parsed = parseImportJson(raw);
  if (!parsed.ok) return parsed;

  const { supabase, user } = await getSessionUser();
  if (!user) {
    return { ok: false, failure: NOT_SIGNED_IN_FAILURE };
  }

  try {
    const preview = await buildImportPreview(supabase, user.id, parsed.data);

    if (preview.conflictingTerms.length > 0 && !confirmReplace) {
      return {
        ok: false,
        failure: {
          title: "Confirm before importing",
          message: `This import would overwrite ${preview.conflictingTerms.length} existing term${preview.conflictingTerms.length === 1 ? "" : "s"}.`,
          details: preview.conflictingTerms,
          hint: "Check the preview and confirm you want to replace the conflicting terms.",
        },
      };
    }

    const result = await executeImport(supabase, user.id, parsed.data, {
      isMerge: preview.isMerge,
    });

    revalidatePath("/jargon");
    redirect(`/jargon?domain=${result.domainId}`);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    if (err instanceof ImportExecutionError) {
      return { ok: false, failure: err.failure };
    }

    return {
      ok: false,
      failure: formatImportFailure(err, { step: "Import failed" }),
    };
  }
}
