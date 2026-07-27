"use client";

import { AlertCircle, Loader2, Settings, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { generateQuizAction, submitQuizResultsAction } from "@/app/(private)/jargon/quiz/actions";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";
import { QuizProgress } from "@/components/jargon/quiz/quiz-progress";
import { QuizQuestionView } from "@/components/jargon/quiz/quiz-question";
import { QuizResults } from "@/components/jargon/quiz/quiz-results";
import {
  QuizCenteredState,
  QuizPanel,
  QuizPanelBody,
  QuizPanelHeader,
  QuizSetupFooter,
  QuizSetupOption,
  QuizStat,
} from "@/components/jargon/quiz/quiz-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAX_QUIZ_TERMS, countTermsForSelection, getMaxQuizQuestionCount } from "@/lib/quiz/terms";
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
  const [questionCount, setQuestionCount] = useState(1);

  const domainIds = selectedCollectionId === "all" ? "all" : [selectedCollectionId];

  const availableTermCount = useMemo(
    () => countTermsForSelection(collections, domainIds, status),
    [collections, domainIds, status],
  );

  const maxQuestionCount = getMaxQuizQuestionCount(availableTermCount);

  useEffect(() => {
    if (availableTermCount === 0) return;
    setQuestionCount(getMaxQuizQuestionCount(availableTermCount));
  }, [availableTermCount, status, selectedCollectionId]);

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

    const result = await generateQuizAction({ domainIds, status, questionCount });

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
    <PageShell innerClassName="space-y-8">
      <PageHeader
        icon={Sparkles}
        title="Quiz"
        description="Test yourself on terms from your active collections."
      />

      {step === "picker" ? (
        <QuizPanel>
          {!llmConfigured ? (
            <QuizPanelBody>
              <QuizCenteredState
                icon={Settings}
                title="LLM not configured"
                description="Add a provider and API key in Settings before starting a quiz."
              >
                <LinkButton href="/jargon/settings">Go to Settings</LinkButton>
              </QuizCenteredState>
            </QuizPanelBody>
          ) : collections.length === 0 ? (
            <QuizPanelBody>
              <QuizCenteredState
                icon={AlertCircle}
                title="No active collections"
                description="Resume a collection on the jargon page before taking a quiz."
              >
                <BackToJargonLink />
              </QuizCenteredState>
            </QuizPanelBody>
          ) : (
            <>
              <QuizPanelHeader
                icon={Sparkles}
                title="Set up your quiz"
                description="Choose what to review and which collection to pull from."
              />
              <QuizPanelBody>
                <fieldset className="mb-4 flex max-w-md flex-col gap-2 border-0 p-0">
                  <legend className="text-sm font-medium leading-none mb-2">What to quiz</legend>
                  <div className="flex flex-col gap-3">
                    <QuizSetupOption
                      name="quiz-status"
                      value="unknown"
                      checked={status === "unknown"}
                      onChange={() => setStatus("unknown")}
                      title="Unknown terms"
                      description="Reinforce terms you have not marked as known yet."
                    />
                    <QuizSetupOption
                      name="quiz-status"
                      value="known"
                      checked={status === "known"}
                      onChange={() => setStatus("known")}
                      title="Known terms"
                      description="Stress-test terms you already know."
                    />
                  </div>
                </fieldset>

                <Field className="max-w-md">
                  <FieldLabel htmlFor="quiz-collection">Collection</FieldLabel>
                  <Select
                    selectedKey={selectedCollectionId}
                    onSelectionChange={(key) => setSelectedCollectionId(String(key))}
                  >
                    <SelectTrigger id="quiz-collection" className="text-sm">
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

                <QuizStat
                  label="Terms available"
                  value={
                    availableTermCount === 0
                      ? "None"
                      : `${availableTermCount} term${availableTermCount === 1 ? "" : "s"}`
                  }
                />

                <Field className="max-w-md">
                  <FieldLabel htmlFor="quiz-question-count">Questions in this quiz</FieldLabel>
                  <Input
                    id="quiz-question-count"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={maxQuestionCount}
                    value={String(questionCount)}
                    onChange={(event) => {
                      const parsed = Number.parseInt(event.target.value, 10);
                      if (Number.isNaN(parsed)) return;
                      setQuestionCount(Math.min(Math.max(1, parsed), maxQuestionCount));
                    }}
                    disabled={availableTermCount === 0}
                    className="max-w-[8rem] tabular-nums"
                  />
                  <FieldDescription>
                    Choose 1–{maxQuestionCount || 1}
                    {availableTermCount > MAX_QUIZ_TERMS
                      ? ` (${MAX_QUIZ_TERMS} max per quiz).`
                      : "."}
                  </FieldDescription>
                </Field>

                {availableTermCount === 0 ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      No {status} terms in the selected collection
                      {selectedCollectionId === "all" ? "s" : ""}. Choose a different option.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <QuizSetupFooter
                  hint={
                    <>Prepared by {providerLabel ?? "your LLM provider"} — may take a moment.</>
                  }
                >
                  <Button
                    type="button"
                    onPress={handleStartQuiz}
                    isDisabled={availableTermCount === 0}
                    className="w-full max-w-md"
                  >
                    Start quiz
                  </Button>
                </QuizSetupFooter>
              </QuizPanelBody>
            </>
          )}
        </QuizPanel>
      ) : null}

      {step === "generating" ? (
        <QuizPanel>
          <QuizPanelBody>
            <QuizCenteredState
              icon={Loader2}
              title="Building your quiz"
              description={`${activeProviderLabel ?? "Your LLM provider"} is writing ${questionCount} question${questionCount === 1 ? "" : "s"}. This usually takes a few seconds.`}
            />
          </QuizPanelBody>
        </QuizPanel>
      ) : null}

      {step === "playing" && questions[currentIndex] ? (
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <QuizProgress
            current={currentIndex + 1}
            total={questions.length}
            correct={correctSoFar}
          />
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
        <div className="mx-auto w-full max-w-2xl">
          <QuizResults
            score={score}
            total={resultsTotal}
            quizStatus={status}
            flippedTerms={flippedTerms}
            onQuizAgain={resetQuizState}
          />
        </div>
      ) : null}

      {step === "error" ? (
        <QuizPanel>
          <QuizPanelHeader
            icon={AlertCircle}
            title="Something went wrong"
            description="The quiz could not be completed."
          />
          <QuizPanelBody className="space-y-4">
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
          </QuizPanelBody>
        </QuizPanel>
      ) : null}
    </PageShell>
  );
}

function BackToJargonLink() {
  return <LinkButton href="/jargon">Back to jargon</LinkButton>;
}
