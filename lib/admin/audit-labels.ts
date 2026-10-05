import type { Json } from "@/lib/supabase/database.types";

type Details = Record<string, Json | undefined>;

function asDetails(details: Json): Details {
  return details && typeof details === "object" && !Array.isArray(details) ? details : {};
}

/** Short text from untrusted details: only strings, numbers and booleans, cut to a sane length. */
function text(value: Json | undefined): string | null {
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 80)}…` : value;
  return typeof value === "number" || typeof value === "boolean" ? String(value) : null;
}

const reason = (d: Details) => (text(d.reason) ? `Reason: ${text(d.reason)}` : null);

const onOff = (value: Json | undefined) => (value === true ? "on" : value === false ? "off" : "?");

type AuditEntry = {
  label: string;
  describe: (details: Details) => string | null;
};

/** Actions the app writes itself, after a change it makes directly. Every one has a label, because
 *  `writeAudit` only accepts these names. */
export const APP_AUDIT_ACTIONS = {
  "app.collection_status": {
    label: "Collection status changed",
    describe: (d) =>
      `${text(d.from) ?? "?"} to ${text(d.to) ?? "?"}${d.slug ? `, /collections/${text(d.slug)}` : ""}`,
  },
  "app.collection_slug": {
    label: "Collection address changed",
    describe: (d) =>
      `${text(d.old) ? `/collections/${text(d.old)}` : "none"} to /collections/${text(d.new) ?? "?"}`,
  },
  "app.collection_kind": {
    label: "Collection kind changed",
    describe: (d) => `${text(d.from) ?? "?"} to ${text(d.to) ?? "?"}`,
  },
  "app.ai_credits_enabled": {
    label: "AI credits switched",
    describe: (d) => `Now ${onOff(d.enabled)}`,
  },
  "app.ai_feature_enabled": {
    label: "AI feature switched",
    describe: (d) => `${text(d.feature) ?? "?"} is now ${onOff(d.enabled)}`,
  },
  "app.narration_access": {
    label: "Narration access changed",
    describe: (d) => `Access is now ${onOff(d.on)}`,
  },
  "app.waitlist_approve": {
    label: "Waitlist request approved",
    describe: (d) => (d.emailSent === false ? "The email failed" : "Invite emailed"),
  },
  "app.invite_resend": { label: "Invite resent", describe: () => null },
  "app.narration_sync_start": {
    label: "Narration sync started",
    describe: (d) => (text(d.job) ? `Job ${text(d.job)}` : null),
  },
  "app.narration_sync_cancel": {
    label: "Narration sync cancelled",
    describe: () => null,
  },
  "app.narration_sync_resume": {
    label: "Narration sync resumed",
    describe: () => null,
  },
  "app.request_accept": {
    label: "Collection request accepted",
    describe: () => null,
  },
  "app.request_ask": {
    label: "Question sent about a collection request",
    describe: () => null,
  },
  "app.request_decline": {
    label: "Collection request declined",
    describe: (d) =>
      `${text(d.reason) ?? "?"}${typeof d.merged === "number" && d.merged > 0 ? `, with ${d.merged} merged` : ""}`,
  },
  "app.request_merge": {
    label: "Collection request merged",
    describe: () => null,
  },
  "app.request_new_date": {
    label: "New estimate set on a collection request",
    describe: (d) => (d.emailSent === false ? "The email failed" : "Delay notice emailed"),
  },
  "app.request_settings": {
    label: "Collection request settings changed",
    describe: (d) =>
      `Requests ${onOff(d.enabled)}, slower than usual ${onOff(d.paused)}, estimate ${text(d.estimateDays) ?? "?"} days (${text(d.pausedEstimateDays) ?? "?"} when slower)`,
  },
  "app.request_email_resend": {
    label: "Request email resent",
    describe: () => null,
  },
  "app.issue_done": { label: "Issue marked done", describe: (d) => text(d.kind) },
  "app.issue_wont_do": { label: "Issue marked won't do", describe: (d) => text(d.kind) },
  "app.issue_reopened": { label: "Issue reopened", describe: (d) => text(d.kind) },
  "app.issue_deleted": { label: "Issue deleted", describe: (d) => text(d.kind) },
} as const satisfies Record<string, AuditEntry>;

export type AppAuditAction = keyof typeof APP_AUDIT_ACTIONS;

/** Actions the database writes inside the same transaction as the change. */
export const DB_AUDIT_ACTIONS = {
  grant_ai_credits: {
    label: "Credits granted",
    describe: (d) => `${text(d.amount) ?? "?"} credits${text(d.note) ? `, "${text(d.note)}"` : ""}`,
  },
  reset_ai_credits: { label: "Usage reset", describe: () => null },
  set_ai_credit_settings: {
    label: "AI credit settings changed",
    describe: (d) => {
      const next = asDetails(d.new ?? null);
      return `Allowance ${text(next.default_allowance) ?? "?"}, monthly ${text(next.monthly_refill) ?? "?"}, quiz ${text(next.quiz_cost) ?? "?"}, story ${text(next.story_cost) ?? "?"}`;
    },
  },
  set_narration_enabled: {
    label: "Narration switched",
    describe: (d) => `Now ${onOff(d.enabled)}`,
  },
  set_narration_provider: {
    label: "Narration provider switched",
    describe: (d) => `${text(d.provider) ?? "?"} now ${onOff(d.enabled)}`,
  },
  set_narration_caps: {
    label: "Narration limits changed",
    describe: (d) => `Terms ${text(d.term_cap) ?? "no limit"}, stories ${text(d.story_cap) ?? "?"}`,
  },
  publish_collection: {
    label: "Collection published",
    describe: (d) => (text(d.slug) ? `/collections/${text(d.slug)}` : null),
  },
  suspend_user: { label: "Account suspended", describe: (d) => reason(d) },
  reactivate_user: { label: "Account reactivated", describe: (d) => reason(d) },
  remove_user_api_key: {
    label: "API key removed",
    describe: (d) => [text(d.provider), reason(d)].filter(Boolean).join(", ") || null,
  },
  delete_user: { label: "Account deleted", describe: (d) => reason(d) },
  create_shared_referral_code: {
    label: "Shared code created",
    describe: (d) =>
      `${text(d.label) ?? "?"}, ${text(d.max_uses) ?? "?"} seats${text(d.expires_at) ? ` until ${text(d.expires_at)?.slice(0, 10)}` : ""}`,
  },
  set_referral_code_active: {
    label: "Shared code switched",
    describe: (d) => `${text(d.label) ?? "?"} is now ${d.active === true ? "active" : "paused"}`,
  },
  deliver_collection_request: {
    label: "Requested collection delivered",
    describe: (d) => `${text(d.deliveries) ?? "?"} delivered, ${text(d.terms) ?? "?"} terms each`,
  },
  fill_request_definitions: {
    label: "Definitions filled for a request",
    describe: (d) => `${text(d.filled) ?? "?"} filled, ${text(d.skipped) ?? "?"} skipped`,
  },
  deliver_existing_collection: {
    label: "Shared collection added for a request",
    describe: (d) => `${text(d.deliveries) ?? "?"} added`,
  },
  stop_sharing_collection: {
    label: "Collection sharing stopped",
    describe: (d) =>
      `${text(d.reason) ?? "?"}, removed from ${text(d.removed_from) ?? "?"} libraries, ${text(d.reports_closed) ?? "?"} reports closed${text(d.note) ? `, "${text(d.note)}"` : ""}`,
  },
  lift_share_lock: {
    label: "Sharing lock lifted",
    describe: (d) =>
      [text(d.reason), text(d.note) ? `"${text(d.note)}"` : null].filter(Boolean).join(", ") ||
      null,
  },
  dismiss_collection_reports: {
    label: "Collection reports dismissed",
    describe: (d) => `${text(d.count) ?? "?"} dismissed`,
  },
} as const satisfies Record<string, AuditEntry>;

const ALL_ACTIONS: Record<string, AuditEntry> = {
  ...APP_AUDIT_ACTIONS,
  ...DB_AUDIT_ACTIONS,
};

export const KNOWN_AUDIT_ACTIONS = Object.keys(ALL_ACTIONS);

/** A label and a sentence for one row. Old or unknown rows fall back to their raw name. */
export function describeAudit(
  action: string,
  details: Json,
): { label: string; summary: string | null } {
  const entry = ALL_ACTIONS[action];
  if (!entry) return { label: action, summary: null };
  return { label: entry.label, summary: entry.describe(asDetails(details)) };
}
