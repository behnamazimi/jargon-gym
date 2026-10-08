import type { BillableFeatureId } from "@/lib/ai/registry";

/** price = ceil(baseCredits + creditsPerUnit × units ÷ unitSize), at least 1. */
export type CreditPrice = { baseCredits: number; creditsPerUnit: number; unitSize: number };

export type CreditCosts = Record<BillableFeatureId, CreditPrice>;

/** Whether the free top-up would work for this person right now. */
export type TopUpState =
  | { available: true; amount: number }
  | { available: false; reason: "balance" | "already-today" | "off"; amount: number };

/** What a person's credits do next. Dates are ISO strings, in UTC terms. */
export type CreditSchedule = {
  nextRefill: { at: string; amount: number } | null;
  /** The soonest credits to lapse, and how many. */
  expiry: { at: string; amount: number } | null;
};

export type CreditState = {
  enabled: boolean;
  total: number;
  remaining: number;
  costs: CreditCosts;
  topUp: TopUpState;
};

export type CreditFeature = BillableFeatureId;
