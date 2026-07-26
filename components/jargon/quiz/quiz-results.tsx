"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
    <Card className="space-y-6 p-5 ring-foreground/5 sm:p-6">
      <div className="space-y-3 text-center">
        <Badge variant={percent >= 80 ? "default" : "secondary"} className="text-[11px]">
          {percent}% correct
        </Badge>
        <div>
          <h2 className="m-0 text-[22px] font-semibold tracking-tight">
            {score}/{total}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">{scoreMessage(score, total)}</p>
        </div>
      </div>

      <Separator />

      {flippedTerms.length > 0 ? (
        <div className="space-y-2">
          <p className="m-0 text-[13px] font-medium">{flippedLabel}</p>
          <ul className="m-0 space-y-1.5">
            {flippedTerms.map((term) => (
              <li
                key={term.id}
                className="rounded-md border px-3 py-2 text-[13px] text-muted-foreground"
              >
                {term.term}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="m-0 text-[13px] text-muted-foreground">No term status changes this round.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onPress={onQuizAgain}>
          <RotateCcw className="size-3.5" />
          Quiz again
        </Button>
        <LinkButton href="/jargon" variant="outline">
          <ArrowLeft className="size-3.5" />
          Back to jargon
        </LinkButton>
      </div>
    </Card>
  );
}
