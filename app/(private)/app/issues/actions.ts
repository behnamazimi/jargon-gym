"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { ISSUE_COPY } from "@/lib/issues/copy";
import { isWebp, issueReportSchema, MAX_SCREENSHOT_BYTES } from "@/lib/issues/schema";
import { deleteScreenshot, screenshotKey, uploadScreenshot } from "@/lib/issues/storage";

type SubmitResult = { ok: true } | { ok: false; error: string };

function text(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Uploads the screenshot when there is one. The key is null when nothing was attached. */
async function uploadIfAttached(
  file: FormDataEntryValue | null,
  key: string,
): Promise<{ ok: true; key: string | null } | { ok: false; error: string }> {
  if (!(file instanceof File) || file.size === 0) return { ok: true, key: null };
  if (file.size > MAX_SCREENSHOT_BYTES) return { ok: false, error: ISSUE_COPY.invalid };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isWebp(bytes)) return { ok: false, error: ISSUE_COPY.screenshotUnsupported };
  try {
    await uploadScreenshot(key, bytes);
    return { ok: true, key };
  } catch (err) {
    console.error("Couldn't upload an issue screenshot:", err);
    return { ok: false, error: ISSUE_COPY.failed };
  }
}

function describeSaveError(message: string): string {
  if (message.includes("issue_quota_reached")) return ISSUE_COPY.quotaReached;
  if (message.includes("invalid_issue")) return ISSUE_COPY.invalid;
  console.error("Couldn't save an issue report:", message);
  return ISSUE_COPY.failed;
}

export async function submitIssueReport(formData: FormData): Promise<SubmitResult> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { ok: false, error: auth.error ?? ISSUE_COPY.failed };

  const parsed = issueReportSchema.safeParse({
    kind: text(formData, "kind"),
    body: text(formData, "body") ?? "",
    pagePath: text(formData, "pagePath"),
    userAgent: text(formData, "userAgent")?.slice(0, 500),
    viewport: text(formData, "viewport"),
  });
  if (!parsed.success) return { ok: false, error: ISSUE_COPY.invalid };

  const id = crypto.randomUUID();
  const upload = await uploadIfAttached(
    formData.get("screenshot"),
    screenshotKey(auth.user.id, id),
  );
  if (!upload.ok) return upload;
  const key = upload.key;

  const { kind, body, pagePath, userAgent, viewport } = parsed.data;
  const { error } = await auth.supabase.rpc("submit_issue_report", {
    p_id: id,
    p_kind: kind,
    p_body: body,
    p_page_path: pagePath,
    p_user_agent: userAgent,
    p_viewport: viewport,
    p_screenshot_path: key ?? undefined,
  });

  if (error) {
    if (key) {
      await deleteScreenshot(key).catch((err) =>
        console.error("Couldn't remove an unsent issue screenshot:", err),
      );
    }
    return { ok: false, error: describeSaveError(error.message) };
  }

  return { ok: true };
}
