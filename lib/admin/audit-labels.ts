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

const onOff = (value: Json | undefined) => (value === true ? "on" : value === false ? "off" : "?");

type AuditEntry = { label: string; describe: (details: Details) => string | null };

/** Actions the app writes itself, after a change it makes directly. Every one has a label, because
 *  `writeAudit` only accepts these names. */
export const APP_AUDIT_ACTIONS = {
  "app.collection_status": {
    label: "Collection status changed",
    describe: (d) =>
      `${text(d.from) ?? "?"} to ${text(d.to) ?? "?"}${d.slug ? `, /j/${text(d.slug)}` : ""}`,
  },
  "app.collection_slug": {
    label: "Collection address changed",
    describe: (d) => `${text(d.old) ? `/j/${text(d.old)}` : "none"} to /j/${text(d.new) ?? "?"}`,
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
  "app.narration_sync_cancel": { label: "Narration sync cancelled", describe: () => null },
  "app.narration_sync_resume": { label: "Narration sync resumed", describe: () => null },
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
  set_narration_caps: {
    label: "Narration limits changed",
    describe: (d) => `Terms ${text(d.term_cap) ?? "no limit"}, stories ${text(d.story_cap) ?? "?"}`,
  },
  publish_collection: {
    label: "Collection published",
    describe: (d) => (text(d.slug) ? `/j/${text(d.slug)}` : null),
  },
} as const satisfies Record<string, AuditEntry>;

const ALL_ACTIONS: Record<string, AuditEntry> = { ...APP_AUDIT_ACTIONS, ...DB_AUDIT_ACTIONS };

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
