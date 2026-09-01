/** Trace-queue types — pure data structures, no runtime imports. */

import type { TraceCandidate } from "@/lib/trace";

export type { TraceCandidate };

/** The six writes recordRead/recordReveal/recordTest can make. */
export type ReviewEvent =
  | "read"
  | "reveal"
  | "review_pass"
  | "review_fail"
  | "quiz_pass"
  | "quiz_fail";

/** Which tier's queue a pick is ranked for. */
export type PickContext = "read" | "review" | "quiz";
