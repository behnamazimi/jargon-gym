"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { generateQuizAction, submitQuizResultsAction } from "@/app/(private)/jargon/quiz/actions";
import { PageHeader } from "@/components/jargon/page-header";
import { QuizProgress } from "@/components/jargon/quiz/quiz-progress";
import { QuizQuestionView } from "@/components/jargon/quiz/quiz-question";
import { QuizResults } from "@/components/jargon/quiz/quiz-results";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MAX_QUIZ_TERMS, countTermsForSelection } from "@/lib/quiz/terms";
import type {
  QuizableCollection,
  QuizAnswer,
  QuizQuestion,
  QuizTerm,
  QuizTermStatus,
} from "@/lib/quiz/types";

type QuizStep = "picker" | "generating" | "playing" | "results" | "error";

type QuizPageProps = {
  llmConfigured: boolean;
  providerLabel: string | null;
  collections: QuizableCollection[];
};

function termCountForCollection(collection: QuizableCollection, status: QuizTermStatus) {
  return status === "known" ? collection.knownCount : collection.unknownCount;
}

function allCollectionsTermCount(collections: QuizableCollection[], status: QuizTermStatus) {
  return collections.reduce(
    (total, collection) => total + termCountForCollection(collection, status),
    0,
  );
}

export function QuizPage({ llmConfigured, providerLabel, collections }: QuizPageProps) {
  const [step, setStep] = useState<QuizStep>("picker");
  const [status, setStatus] = useState<QuizTermStatus>("unknown");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("all");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [terms, setTerms] = useState<QuizTerm[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [flippedTerms, setFlippedTerms] = useState<{ id: string; term: string }[]>([]);
  const [resultsScore, setResultsScore] = useState<{ score: number; total: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeProviderLabel, setActiveProviderLabel] = useState(providerLabel);

  const domainIds = selectedCollectionId === "all" ? "all" : [selectedCollectionId];

  const availableTermCount = useMemo(
    () => countTermsForSelection(collections, domainIds, status),
    [collections, domainIds, status],
  );

  const quizTermCount = Math.min(availableTermCount, MAX_QUIZ_TERMS);

  const termById = useMemo(() => new Map(terms.map((term) => [term.id, term])), [terms]);

  const correctSoFar = answers.filter((answer) => answer.passed).length;

  function resetQuizState() {
    setQuestions([]);
    setTerms([]);
    setCurrentIndex(0);
    setAnswers([]);
    setFlippedTerms([]);
    setResultsScore(null);
    setErrorMessage(null);
    setStep("picker");
  }

  async function handleStartQuiz() {
    setErrorMessage(null);
    setStep("generating");

    const result = await generateQuizAction({ domainIds, status });

    if ("error" in result) {
      setErrorMessage(result.error);
      setStep("error");
      return;
    }

    setQuestions(result.questions);
    setTerms(result.terms);
    setActiveProviderLabel(result.providerLabel);
    setCurrentIndex(0);
    setAnswers([]);
    setStep("playing");
  }

  async function handleQuestionAnswer(passed: boolean) {
    const question = questions[currentIndex];
    const nextAnswers = [...answers, { termId: question.termId, passed }];
    setAnswers(nextAnswers);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    const result = await submitQuizResultsAction({ status, answers: nextAnswers });

    if (result.error) {
      setErrorMessage(result.error);
      setStep("error");
      return;
    }

    setFlippedTerms(result.flippedTerms ?? []);
    setResultsScore({
      score: nextAnswers.filter((answer) => answer.passed).length,
      total: questions.length,
    });
    setStep("results");
  }

  const score = resultsScore?.score ?? answers.filter((answer) => answer.passed).length;
  const resultsTotal = resultsScore?.total ?? questions.length;

  return (
    <div className="min-h-full bg-gradient-to-b from-primary/[0.06] via-background to-background text-foreground">
      <div className="mx-auto max-w-[720px] space-y-8 px-5 py-7 pb-20">
        <PageHeader
          icon={Sparkles}
          title="Quiz"
          description="Test yourself on terms from your active collections."
          backLabel="Back to jargon"
        />

        {step === "picker" ? (
          <Card className="space-y-6 p-5 ring-foreground/5 sm:p-6">
            {!llmConfigured ? (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Configure an LLM provider and API key in Settings before starting a quiz.
                  </AlertDescription>
                </Alert>
                <LinkButton href="/jargon/settings">Go to Settings</LinkButton>
              </div>
            ) : collections.length === 0 ? (
              <Alert>
                <AlertDescription>
                  You have no active collections for review. Resume a collection on the jargon page
                  first.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Field>
                  <FieldLabel>What to quiz</FieldLabel>
                  <ToggleGroup
                    selectionMode="single"
                    selectedKeys={[status]}
                    onSelectionChange={(keys) => {
                      const next = Array.from(keys)[0];
                      if (next === "known" || next === "unknown") setStatus(next);
                    }}
                    className="w-full max-w-[465px]"
                  >
                    <ToggleGroupItem id="unknown" className="flex-1">
                      Unknown terms
                    </ToggleGroupItem>
                    <ToggleGroupItem id="known" className="flex-1">
                      Known terms
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <FieldDescription>
                    {status === "unknown"
                      ? "Reinforce terms you have not marked as known yet."
                      : "Stress-test terms you already know."}
                  </FieldDescription>
                </Field>

                <Field className="max-w-[465px]">
                  <FieldLabel htmlFor="quiz-collection">Collection</FieldLabel>
                  <Select
                    selectedKey={selectedCollectionId}
                    onSelectionChange={(key) => setSelectedCollectionId(String(key))}
                  >
                    <SelectTrigger id="quiz-collection" className="text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem id="all">
                        All active collections ({allCollectionsTermCount(collections, status)})
                      </SelectItem>
                      {collections.map((collection) => (
                        <SelectItem key={collection.id} id={collection.id}>
                          {collection.name} ({termCountForCollection(collection, status)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Separator />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="m-0 text-[13px] font-medium">
                      {availableTermCount === 0
                        ? "No terms available"
                        : `${quizTermCount} term${quizTermCount === 1 ? "" : "s"} ready`}
                    </p>
                    <FieldDescription>
                      Prepared by {providerLabel ?? "your LLM provider"} — may take a moment.
                      {availableTermCount > MAX_QUIZ_TERMS
                        ? ` Up to ${MAX_QUIZ_TERMS} terms per quiz.`
                        : null}
                    </FieldDescription>
                  </div>
                  {availableTermCount > 0 ? (
                    <Badge variant="outline">{quizTermCount} questions</Badge>
                  ) : null}
                </div>

                {availableTermCount === 0 ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      No {status} terms in the selected collection
                      {selectedCollectionId === "all" ? "s" : ""}. Choose a different option.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <Button
                  type="button"
                  onPress={handleStartQuiz}
                  isDisabled={availableTermCount === 0}
                  className="w-full max-w-[465px]"
                >
                  Start quiz
                </Button>
              </>
            )}
          </Card>
        ) : null}

        {step === "generating" ? (
          <Card className="space-y-4 p-5 ring-foreground/5 sm:p-6">
            <div className="mx-auto flex max-w-sm flex-col items-center gap-4 text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Loader2 className="size-5 animate-spin" aria-hidden />
              </div>
              <div className="space-y-1">
                <h2 className="m-0 text-[16px] font-semibold">Building your quiz</h2>
                <p className="m-0 text-[13px] text-muted-foreground">
                  {activeProviderLabel ?? "Your LLM provider"} is writing questions for{" "}
                  {quizTermCount} term{quizTermCount === 1 ? "" : "s"}. This usually takes a few
                  seconds.
                </p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/60" />
              </div>
            </div>
          </Card>
        ) : null}

        {step === "playing" && questions[currentIndex] ? (
          <div className="space-y-4">
            <QuizProgress current={currentIndex + 1} total={questions.length} />
            <p className="m-0 text-[12px] text-muted-foreground">{correctSoFar} correct so far</p>
            <QuizQuestionView
              key={`${questions[currentIndex].termId}-${currentIndex}`}
              question={questions[currentIndex]}
              termLabel={termById.get(questions[currentIndex].termId)?.term ?? "Term"}
              isLast={currentIndex + 1 === questions.length}
              onAnswer={handleQuestionAnswer}
            />
          </div>
        ) : null}

        {step === "results" ? (
          <QuizResults
            score={score}
            total={resultsTotal}
            quizStatus={status}
            flippedTerms={flippedTerms}
            onQuizAgain={resetQuizState}
          />
        ) : null}

        {step === "error" ? (
          <Card className="space-y-4 p-5 ring-foreground/5 sm:p-6">
            <Alert variant="destructive">
              <AlertDescription>{errorMessage ?? "Something went wrong."}</AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onPress={resetQuizState}>
                Try again
              </Button>
              <LinkButton href="/jargon/settings" variant="ghost">
                Check settings
              </LinkButton>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
