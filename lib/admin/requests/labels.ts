import { DOMAIN_LANGUAGE_OPTIONS } from "@/lib/terms/languages";

export const ADMIN_STATUS: Record<string, { label: string; badge: string }> = {
  requested: { label: "In the queue", badge: "badge-ghost" },
  in_progress: { label: "Being prepared", badge: "badge-warning badge-soft" },
  needs_input: { label: "Waiting for a reply", badge: "badge-info badge-soft" },
  merged: { label: "Merged", badge: "badge-ghost" },
  ready: { label: "Ready", badge: "badge-success badge-soft" },
  declined: { label: "Declined", badge: "badge-error badge-soft" },
  cancelled: { label: "Cancelled", badge: "badge-ghost" },
};

export const ADMIN_DECLINE_REASONS: Record<string, string> = {
  too_broad: "Too broad",
  too_niche: "Too niche",
  not_jargon_or_vocabulary: "Not terms or vocabulary",
  language_not_supported: "Language not supported yet",
  team_internal: "Team-internal terms we can't know",
};

export const ADMIN_LEVELS: Record<string, string> = {
  new: "New to it",
  basics: "Knows the basics",
  brushing_up: "Brushing up",
  a1_a2: "A1–A2",
  b1_plus: "B1 and up",
};

/** "Jargon · English · about 50", the one-line shape of a request. */
export function describeRequestShape(request: {
  kind: string;
  language: string;
  size: number | null;
}): string {
  const language =
    DOMAIN_LANGUAGE_OPTIONS.find((option) => option.value === request.language)?.label ??
    request.language;
  const kind = { vocabulary: "Vocabulary", definitions: "Definitions" }[request.kind] ?? "Jargon";
  const parts = [kind, language];
  if (request.size) parts.push(`about ${request.size}`);
  return parts.join(" · ");
}
