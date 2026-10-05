import type { IssueKind, IssueStatus } from "@/lib/issues/schema";

export const ADMIN_ISSUE_KIND: Record<IssueKind, { label: string; badge: string }> = {
  problem: { label: "Problem", badge: "badge-error badge-soft" },
  idea: { label: "Idea", badge: "badge-info badge-soft" },
};

export const ADMIN_ISSUE_STATUS: Record<IssueStatus, { label: string; badge: string }> = {
  new: { label: "New", badge: "badge-warning badge-soft" },
  done: { label: "Done", badge: "badge-success badge-soft" },
  wont_do: { label: "Won't do", badge: "badge-ghost" },
};
