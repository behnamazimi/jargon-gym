import type { PendingReviewWrite, ReviewRating } from "@/lib/review/types";
import type { ReviewGrade } from "@/lib/trace";

export function upsertRating(
  ratings: ReviewRating[],
  key: string,
  grade: ReviewGrade,
): ReviewRating[] {
  const without = ratings.filter((rating) => rating.key !== key);
  return [...without, { key, grade }];
}

function pendingWriteKey(write: Pick<PendingReviewWrite, "termId" | "visit">): string {
  return `${write.termId}:${write.visit ?? 0}`;
}

export function upsertPendingWrite(
  pendingWrites: PendingReviewWrite[],
  write: PendingReviewWrite,
): PendingReviewWrite[] {
  const without = pendingWrites.filter(
    (existing) => pendingWriteKey(existing) !== pendingWriteKey(write),
  );
  return [...without, write];
}
