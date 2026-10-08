import type { BillableFeatureId } from "@/lib/ai/registry";

/** price = ceil(baseCredits + creditsPerUnit × units ÷ unitSize), at least 1. */
export type CreditPrice = { baseCredits: number; creditsPerUnit: number; unitSize: number };

export type CreditCosts = Record<BillableFeatureId, CreditPrice>;

export type CreditState = {
  enabled: boolean;
  total: number;
  remaining: number;
  costs: CreditCosts;
};

export type CreditFeature = BillableFeatureId;
