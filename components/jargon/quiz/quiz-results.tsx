"use client";

import { type CSSProperties } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import { BackLink } from "@/components/jargon/back-link";
import {
  QuizActionBar,
  QuizPanel,
  QuizPanelBody,
  QuizPanelHeader,
  QuizTermList,
} from "@/components/jargon/quiz/quiz-ui";
import { Button } from "@/components/ui/button";
import type { QuizTermStatus } from "@/lib/quiz/types";

type QuizResultsProps = {
  score: number;
  total: number;
  quizStatus: QuizTermStatus;
  flippedTerms: { id: string; term: string }[];
  onQuizAgain: () => void;
};

function scoreMessage(score: number, total: number) {
  if (total === 0) return "No questions answered.";
  const ratio = score / total;
  if (ratio === 1) return "Perfect score — nice work.";
  if (ratio >= 0.8) return "Strong round. Keep it up.";
  if (ratio >= 0.5) return "Solid effort. Review the misses.";
  return "Good practice — focus on the terms you missed.";
}

export function QuizResults({
  score,
  total,
  quizStatus,
  flippedTerms,
  onQuizAgain,
}: QuizResultsProps) {
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const flippedLabel = quizStatus === "known" ? "Marked as unknown" : "Marked as known";

  return (
    <QuizPanel>
      <QuizPanelHeader
        icon={Trophy}
        title="Quiz complete"
        description={scoreMessage(score, total)}
      />
      <QuizPanelBody className="space-y-6">
        <div className="flex flex-col items-center gap-4 py-2 text-center sm:flex-row sm:gap-8 sm:text-left">
          <div
            className="radial-progress text-primary"
            style={
              {
                "--value": percent,
                "--size": "5.5rem",
                "--thickness": "4px",
              } as CSSProperties
            }
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${percent}% correct`}
          >
            <span className="text-base font-semibold tabular-nums">{percent}%</span>
          </div>
          <div>
            <p className="m-0 text-3xl font-bold tabular-nums tracking-tight">
              {score}
              <span className="text-lg font-semibold text-base-content/40">/{total}</span>
            </p>
            <p className="mt-1 mb-0 text-sm text-base-content/60">questions answered correctly</p>
          </div>
        </div>

        <QuizTermList
          title={flippedLabel}
          terms={flippedTerms}
          emptyMessage="No term status changes this round."
        />

        <QuizActionBar>
          <Button type="button" onPress={onQuizAgain}>
            <RotateCcw className="size-3.5" aria-hidden strokeWidth={1.5} />
            Quiz again
          </Button>
          <BackLink variant="outline" />
        </QuizActionBar>
      </QuizPanelBody>
    </QuizPanel>
  );
}
