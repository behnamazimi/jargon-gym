import type { PendingReviewWrite, ReviewRating } from "@/lib/review/types";
import type { ReviewGrade } from "@/lib/trace";

export function upsertRating(
  ratings: ReviewRating[],
  termId: string,
  grade: ReviewGrade,
): ReviewRating[] {
  const without = ratings.filter((rating) => rating.termId !== termId);
  return [...without, { termId, grade }];
}

export function upsertPendingWrite(
  pendingWrites: PendingReviewWrite[],
  write: PendingReviewWrite,
): PendingReviewWrite[] {
  const without = pendingWrites.filter((existing) => existing.termId !== write.termId);
  return [...without, write];
}
