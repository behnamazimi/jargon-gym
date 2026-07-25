"use server";

import { createClient } from "@/lib/supabase/server";
import { executeImport } from "@/lib/jargon/import/execute-import";
import { formatImportFailure, ImportExecutionError } from "@/lib/jargon/import/errors";
import { buildImportPreview, parseImportJson } from "@/lib/jargon/import/validate-import";
import type { ImportFailure, ImportPreview, ImportResult } from "@/lib/jargon/import/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function validateImportJson(
  raw: string,
): Promise<{ ok: true; preview: ImportPreview } | { ok: false; failure: ImportFailure }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      failure: {
        title: "Not signed in",
        message: "You must be logged in to import jargon.",
        hint: "Sign in, then return to this page.",
      },
    };
  }

  const parsed = parseImportJson(raw);
  if (!parsed.ok) return parsed;

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
): Promise<{ ok: true; result: ImportResult } | { ok: false; failure: ImportFailure }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      failure: {
        title: "Not signed in",
        message: "You must be logged in to import jargon.",
        hint: "Sign in, then return to this page.",
      },
    };
  }

  const parsed = parseImportJson(raw);
  if (!parsed.ok) return parsed;

  try {
    const preview = await buildImportPreview(supabase, user.id, parsed.data);
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
