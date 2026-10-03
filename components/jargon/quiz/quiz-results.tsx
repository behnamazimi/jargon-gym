"use client";

import { type CSSProperties } from "react";
import { ChevronDown, Dumbbell, RotateCcw, SlidersHorizontal, Trophy } from "lucide-react";
import { KeepTrainingScene, QuizCheerScene } from "@/components/illustrations/scenes/quiz-results";
import { QuizPanel, QuizPanelBody, QuizPanelHeader } from "@/components/jargon/quiz/quiz-ui";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { QuizTerm } from "@/lib/quiz/types";

type QuizResultsProps = {
  score: number;
  total: number;
  practice: boolean;
  missedTerms: QuizTerm[];
  onQuizAgain: () => void;
  onPractice: () => void;
  onChangeSetup: () => void;
};

function scoreMessage(score: number, total: number) {
  if (total === 0) return "No questions answered.";
  const ratio = score / total;
  if (ratio === 1) return "All correct.";
  if (ratio >= 0.8) return "Strong round.";
  if (ratio >= 0.5) return "Review the terms you missed.";
  return "Review the terms you missed.";
}

/** Expands in place: a finished quiz can't be restored after navigating
 *  away, so the definitions live here rather than behind links. */
function MissedTerms({ terms }: { terms: QuizTerm[] }) {
  return (
    <section aria-labelledby="quiz-missed-heading" className="space-y-2">
      <h3
        id="quiz-missed-heading"
        className="m-0 text-xs font-semibold tracking-wider text-base-content/70 uppercase"
      >
        Missed ({terms.length})
      </h3>
      <ul className="m-0 list-none divide-y divide-base-300/60 rounded-field p-0 ring-1 ring-base-content/10">
        {terms.map((term) => (
          <li key={term.id}>
            <Collapsible className="group">
              <CollapsibleTrigger className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-field border-none bg-transparent px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-base-content">
                    {term.term}
                  </span>
                  <span className="block truncate text-xs text-base-content/70">
                    {term.domainName}
                  </span>
                </span>
                <ChevronDown
                  className="size-4 shrink-0 text-base-content/70 transition-transform duration-200 group-data-[expanded]:rotate-180"
                  aria-hidden
                  strokeWidth={1.5}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 px-3 pb-3 text-sm text-base-content/75">
                  <p className="m-0">{term.definition}</p>
                  {term.example ? (
                    <p className="m-0 text-base-content/70 italic">{term.example}</p>
                  ) : null}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function QuizResults({
  score,
  total,
  practice,
  missedTerms,
  onQuizAgain,
  onPractice,
  onChangeSetup,
}: QuizResultsProps) {
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const hasMisses = missedTerms.length > 0;
  const strongRound = !practice && total > 0 && score / total >= 0.8;

  return (
    <QuizPanel className="flex max-h-full min-h-0 flex-col">
      <QuizPanelHeader
        icon={practice ? Dumbbell : Trophy}
        title={practice ? "Practice complete" : "Quiz complete"}
        description={
          practice ? "Practice round: not counted toward mastery." : scoreMessage(score, total)
        }
      />
      <QuizPanelBody className="min-h-0 flex-1 space-y-6 overflow-y-auto">
        <div className="flex justify-center">
          {strongRound ? (
            <QuizCheerScene className="w-40 sm:w-48" />
          ) : (
            <KeepTrainingScene className="w-40 sm:w-48" />
          )}
        </div>
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
            <p className="m-0 text-3xl font-semibold tabular-nums">
              {score}
              <span className="text-lg font-medium text-base-content/40">/{total}</span>
            </p>
            <p className="mt-1 mb-0 text-sm text-base-content/70">questions answered correctly</p>
          </div>
        </div>

        {hasMisses ? <MissedTerms terms={missedTerms} /> : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {practice ? (
            <>
              {hasMisses ? (
                <Button type="button" onPress={onPractice} className="min-h-11">
                  <Dumbbell className="size-3.5" aria-hidden strokeWidth={1.5} />
                  Practice again
                </Button>
              ) : null}
              <Button
                type="button"
                variant={hasMisses ? "outline" : "default"}
                onPress={onQuizAgain}
                className="min-h-11"
              >
                <RotateCcw className="size-3.5" aria-hidden strokeWidth={1.5} />
                Start a real quiz
              </Button>
            </>
          ) : (
            <>
              <Button type="button" onPress={onQuizAgain} className="min-h-11">
                <RotateCcw className="size-3.5" aria-hidden strokeWidth={1.5} />
                Quiz again
              </Button>
              {hasMisses ? (
                <Button type="button" variant="outline" onPress={onPractice} className="min-h-11">
                  <Dumbbell className="size-3.5" aria-hidden strokeWidth={1.5} />
                  Practice missed (not scored)
                </Button>
              ) : null}
            </>
          )}
          <Button type="button" variant="ghost" onPress={onChangeSetup} className="min-h-11">
            <SlidersHorizontal className="size-3.5" aria-hidden strokeWidth={1.5} />
            Change setup
          </Button>
        </div>
      </QuizPanelBody>
    </QuizPanel>
  );
}
