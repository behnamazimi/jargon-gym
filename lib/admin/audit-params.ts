import { KNOWN_AUDIT_ACTIONS } from "./audit-labels";
import { first, type RawParams } from "./list-params";

export type AuditParams = { action: string | null; page: number };

export function parseAuditParams(raw: RawParams): AuditParams {
  const action = first(raw.action);
  const page = Number.parseInt(first(raw.page) ?? "", 10);
  return {
    action: action && KNOWN_AUDIT_ACTIONS.includes(action) ? action : null,
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 100_000) : 1,
  };
}

export function auditHref(params: Partial<AuditParams>): string {
  const query = new URLSearchParams();
  if (params.action) query.set("action", params.action);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const text = query.toString();
  return text ? `/admin/system/audit?${text}` : "/admin/system/audit";
}
