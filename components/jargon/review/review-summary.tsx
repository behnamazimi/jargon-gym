"use client";

import { CheckCircle2, RotateCcw } from "lucide-react";
import { BackLink } from "@/components/jargon/back-link";
import {
  QuizPanel,
  QuizPanelBody,
  QuizPanelHeader,
  QuizStat,
} from "@/components/jargon/quiz/quiz-ui";
import { Button } from "@/components/ui/button";

type ReviewSummaryProps = {
  reviewedCount: number;
  retainedCount: number;
  forgotCount: number;
  onReviewAgain: () => void;
};

function summaryDescription(reviewedCount: number, retainedCount: number) {
  if (reviewedCount === 0) return "No terms reviewed this time.";
  if (retainedCount === reviewedCount) return "You got every one — great work.";
  return "Keep going on the terms you're still learning.";
}

export function ReviewSummary({
  reviewedCount,
  retainedCount,
  forgotCount,
  onReviewAgain,
}: ReviewSummaryProps) {
  return (
    <QuizPanel>
      <QuizPanelHeader
        icon={CheckCircle2}
        title="Review complete"
        description={summaryDescription(reviewedCount, retainedCount)}
      />
      <QuizPanelBody className="space-y-6">
        <dl className="grid grid-cols-1 gap-3">
          <QuizStat label="Terms reviewed" value={reviewedCount} />
          <QuizStat label="Got it" value={retainedCount} variant="primary" />
          <QuizStat label="Missed it" value={forgotCount} />
        </dl>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" onPress={onReviewAgain} className="min-h-11">
            <RotateCcw className="size-3.5" aria-hidden strokeWidth={1.5} />
            Review again
          </Button>
          <BackLink variant="outline" className="min-h-11" />
        </div>
      </QuizPanelBody>
    </QuizPanel>
  );
}
