"use server";

import { z } from "zod";
import { AdminError } from "@/lib/admin/admin-error";
import { runAdminAction } from "@/lib/admin/action";
import { writeAudit } from "@/lib/admin/audit";
import { ISSUE_STATUSES, type IssueStatus } from "@/lib/issues/schema";
import { deleteScreenshot } from "@/lib/issues/storage";

const idSchema = z.string().uuid();

const STATUS_AUDIT = {
  new: "app.issue_reopened",
  done: "app.issue_done",
  wont_do: "app.issue_wont_do",
} as const satisfies Record<IssueStatus, string>;

function parseId(id: unknown): string {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new AdminError("That issue doesn't exist.");
  return parsed.data;
}

function revalidateFor(id: string) {
  return { revalidate: ["/admin", "/admin/issues", `/admin/issues/${id}`] };
}

export async function setIssueStatus(input: { id: string; status: IssueStatus }) {
  return runAdminAction(async ({ supabase }) => {
    const id = parseId(input.id);
    if (!ISSUE_STATUSES.includes(input.status)) throw new AdminError("Pick a status.");
    const { data, error } = await supabase
      .from("issue_reports")
      .update({ status: input.status, status_changed_at: new Date().toISOString() })
      .eq("id", id)
      .select("kind")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new AdminError("That issue doesn't exist.");
    await writeAudit(supabase, {
      action: STATUS_AUDIT[input.status],
      targetType: "issue_report",
      targetId: id,
      details: { kind: data.kind },
    });
  }, revalidateFor(input.id));
}

/** Removes the screenshot before the row, so a failed storage call never leaves a file behind. */
export async function deleteIssue(input: { id: string }) {
  return runAdminAction(
    async ({ supabase }) => {
      const id = parseId(input.id);
      const { data: issue, error: readError } = await supabase
        .from("issue_reports")
        .select("kind, screenshot_path")
        .eq("id", id)
        .maybeSingle();
      if (readError) throw readError;
      if (!issue) throw new AdminError("That issue doesn't exist.");

      if (issue.screenshot_path) {
        try {
          await deleteScreenshot(issue.screenshot_path);
        } catch (err) {
          console.error("Couldn't remove an issue screenshot:", err);
          throw new AdminError(
            "Couldn't remove the screenshot, so nothing was deleted. Try again.",
          );
        }
      }

      const { error } = await supabase.from("issue_reports").delete().eq("id", id);
      if (error) throw error;
      await writeAudit(supabase, {
        action: "app.issue_deleted",
        targetType: "issue_report",
        targetId: id,
        details: { kind: issue.kind },
      });
    },
    // The issue's own page is gone, so only the lists refresh.
    { revalidate: ["/admin", "/admin/issues"] },
  );
}
