import type { AiAccessView } from "@/lib/llm/types";
import type { TopUpState } from "./types";

/** What to offer someone whose request can't be paid for right now. */
export type CreditGate =
  | { kind: "top-up"; amount: number }
  | { kind: "tomorrow" }
  | { kind: "short" };

export function creditGate(topUp: TopUpState | undefined): CreditGate {
  if (topUp?.available) return { kind: "top-up", amount: topUp.amount };
  if (topUp?.reason === "already-today") return { kind: "tomorrow" };
  return { kind: "short" };
}

/** True when the person has no credits left at all. */
export function isExhausted(ai: AiAccessView): boolean {
  return ai.kind === "unavailable" && ai.reason === "exhausted";
}
