import type { BillableFeatureId } from "@/lib/ai/registry";

export type CreditCosts = { quizPerQuestion: number; storyPerTerm: number };

export type CreditState = {
  enabled: boolean;
  total: number;
  remaining: number;
  costs: CreditCosts;
};

export type CreditFeature = BillableFeatureId;
