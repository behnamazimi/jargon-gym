import { first, type RawParams } from "@/lib/admin/list-params";
import type { IssueKind, IssueStatus } from "@/lib/issues/schema";

export type IssueTab = "open" | "done" | "wont_do";
type IssueKindFilter = "all" | IssueKind;

export type IssueListParams = { tab: IssueTab; kind: IssueKindFilter; page: number };

export const TAB_STATUS: Record<IssueTab, IssueStatus> = {
  open: "new",
  done: "done",
  wont_do: "wont_do",
};

export function parseIssueParams(raw: RawParams): IssueListParams {
  const tab = first(raw.tab);
  const kind = first(raw.kind);
  const page = Number.parseInt(first(raw.page) ?? "", 10);
  return {
    tab: tab === "done" || tab === "wont_do" ? tab : "open",
    kind: kind === "problem" || kind === "idea" ? kind : "all",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 100_000) : 1,
  };
}

/** An address for the issues page that keeps only what is set. */
export function issuesHref(params: Partial<IssueListParams>): string {
  const query = new URLSearchParams();
  if (params.tab && params.tab !== "open") query.set("tab", params.tab);
  if (params.kind && params.kind !== "all") query.set("kind", params.kind);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const text = query.toString();
  return text ? `/admin/issues?${text}` : "/admin/issues";
}
