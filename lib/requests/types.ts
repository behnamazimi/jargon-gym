import type { DomainLanguage } from "@/lib/jargon/languages";

export const REQUEST_KINDS = ["jargon", "vocabulary"] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

export const REQUEST_LEVELS = {
  jargon: ["new", "basics", "brushing_up"],
  vocabulary: ["a1_a2", "b1_plus"],
} as const satisfies Record<RequestKind, readonly string[]>;
export type RequestLevel = (typeof REQUEST_LEVELS)[RequestKind][number];

export const REQUEST_SIZES = [20, 50, 100] as const;

export const DECLINE_REASONS = [
  "too_broad",
  "too_niche",
  "not_jargon_or_vocabulary",
  "language_not_supported",
  "team_internal",
] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];

export type RequestStatus =
  | "requested"
  | "in_progress"
  | "needs_input"
  | "ready"
  | "declined"
  | "cancelled"
  | "merged";

/** What a person sees: a merged request shows the status of the one it follows. */
export type DisplayStatus = "requested" | "in_progress" | "needs_input" | "ready" | "declined";

export type RequestQuota = {
  enabled: boolean;
  paused: boolean;
  estimateDays: number;
  used: number;
  limit: number;
  nextAvailableAt: string | null;
  openRequestId: string | null;
  openRequestTopic: string | null;
};

export type MyRequest = {
  id: string;
  topic: string;
  kind: RequestKind;
  language: DomainLanguage;
  status: RequestStatus;
  displayStatus: DisplayStatus;
  /** Already formatted in the person's time zone, so server and browser agree. */
  dueDate: string;
  question: string | null;
  declineReason: DeclineReason | null;
  declineNote: string | null;
  deliveryKind: "prepared" | "added_shared" | null;
  deliveredDomainId: string | null;
  deliveredDomainName: string | null;
  deliveredTerms: number | null;
  delayNotified: boolean;
  notifyEmail: boolean;
  accepted: boolean;
  createdDate: string;
};
