"use client";

import { CheckCircle2, RotateCcw } from "lucide-react";
import { BackLink } from "@/components/jargon/back-link";
import {
  QuizActionBar,
  QuizPanel,
  QuizPanelBody,
  QuizPanelHeader,
  QuizStat,
} from "@/components/jargon/quiz/quiz-ui";
import { Button } from "@/components/ui/button";
import type { ReviewTermStatus } from "@/lib/review/types";
import { cn } from "@/lib/utils";

type ReviewSummaryProps = {
  reviewedCount: number;
  sessionStatus: ReviewTermStatus;
  retainedCount: number;
  forgotCount: number;
  onReviewAgain: () => void;
};

function summaryDescription(
  sessionStatus: ReviewTermStatus,
  reviewedCount: number,
  retainedCount: number,
  forgotCount: number,
) {
  if (reviewedCount === 0) return "No cards reviewed this session.";

  if (sessionStatus === "known") {
    if (forgotCount === 0) return "You still know every card you reviewed.";
    if (forgotCount === reviewedCount) return "Worth another pass — these need more practice.";
    return `${forgotCount} term${forgotCount === 1 ? "" : "s"} moved back to unknown.`;
  }

  if (retainedCount === reviewedCount) return "You knew every card you reviewed — great work.";
  return "Keep reviewing the terms you're still learning.";
}

export function ReviewSummary({
  reviewedCount,
  sessionStatus,
  retainedCount,
  forgotCount,
  onReviewAgain,
}: ReviewSummaryProps) {
  const isKnownRefresh = sessionStatus === "known";

  return (
    <QuizPanel>
      <QuizPanelHeader
        icon={CheckCircle2}
        title="Review complete"
        description={summaryDescription(sessionStatus, reviewedCount, retainedCount, forgotCount)}
      />
      <QuizPanelBody className="space-y-6">
        <dl className={cn("grid gap-3", isKnownRefresh ? "grid-cols-3" : "grid-cols-2")}>
          <QuizStat label="Cards reviewed" value={reviewedCount} />
          <QuizStat
            label={isKnownRefresh ? "Still know" : "Marked as known"}
            value={retainedCount}
            variant="primary"
          />
          {isKnownRefresh ? <QuizStat label="Forgot" value={forgotCount} /> : null}
        </dl>

        <QuizActionBar>
          <Button type="button" onPress={onReviewAgain}>
            <RotateCcw className="size-3.5" aria-hidden strokeWidth={1.5} />
            Review again
          </Button>
          <BackLink variant="outline" />
        </QuizActionBar>
      </QuizPanelBody>
    </QuizPanel>
  );
}
