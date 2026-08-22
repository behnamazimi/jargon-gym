"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  generateQuizAction,
  previewQuizQueueAction,
  recordQuizAnswerAction,
  submitQuizResultsAction,
} from "@/app/(private)/jargon/quiz/actions";
import { AdminOnly, useIsAdmin, useShowAdminUi } from "@/components/admin-only";
import { QueuePreview, type QueuePreviewItem } from "@/components/jargon/pick-reason-badges";
import { QuizQuestionView } from "@/components/jargon/quiz/quiz-question";
import { QuizResults } from "@/components/jargon/quiz/quiz-results";
import {
  QuizCenteredState,
  QuizPanel,
  QuizPanelBody,
  QuizPanelHeader,
  QuizPanelLabel,
  QuizProgress,
  QuizSetupFooter,
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
import { getMaxStudyCount } from "@/lib/study/count";
import { MAX_STUDY_TERMS } from "@/lib/study/types";
import { countTermsForSelection } from "@/lib/quiz/terms";
import { cn } from "@/lib/utils";
import type {
  QuizableCollection,
  QuizAnswer,
  QuizQuestion,
  QuizQuestionStyle,
  QuizTerm,
} from "@/lib/quiz/types";
import {
  clearQuizSession,
  loadQuizSession,
  saveQuizSession,
  type QuizSessionState,
} from "@/lib/quiz/session-storage";

const NOTHING_ELIGIBLE_MESSAGE =
  "Nothing eligible today (read or missed). Try tomorrow or mark more known.";

type QuizStep = "picker" | "generating" | "playing" | "results" | "error";

type QuizPageProps = {
  llmConfigured: boolean;
  providerLabel: string | null;
  collections: QuizableCollection[];
  initialDomainId?: string;
};

function allCollectionsTermCount(collections: QuizableCollection[]) {
  return collections.reduce((total, collection) => total + collection.knownCount, 0);
}

function questionCountPresetValues(maxQuestionCount: number): number[] {
  if (maxQuestionCount < 1) return [];
  const values = [5, 10, maxQuestionCount].filter(
    (value) => value >= 1 && value <= maxQuestionCount,
  );
  return [...new Set(values)].sort((a, b) => a - b);
}

export function QuizPage({
  llmConfigured,
  providerLabel,
  collections,
  initialDomainId,
}: QuizPageProps) {
  const [step, setStep] = useState<QuizStep>("picker");
  const [questionStyle, setQuestionStyle] = useState<QuizQuestionStyle>("simple");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(
    initialDomainId ?? "all",
  );
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [terms, setTerms] = useState<QuizTerm[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [flippedTerms, setFlippedTerms] = useState<{ id: string; term: string }[]>([]);
  const [flippedTermIds, setFlippedTermIds] = useState<string[]>([]);
  const [resultsScore, setResultsScore] = useState<{
    score: number;
    total: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(1);
  const [questionCountInput, setQuestionCountInput] = useState("1");
  const [questionCountError, setQuestionCountError] = useState<string | null>(null);
  const [savedSession, setSavedSession] = useState<QuizSessionState | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string>(new Date().toISOString());
  const [queuePreview, setQueuePreview] = useState<QueuePreviewItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const isAdmin = useIsAdmin();
  const showAdminUi = useShowAdminUi();
  const showQueuePreview = isAdmin && showAdminUi;

  const domainIds = useMemo(
    (): "all" | string[] => (selectedCollectionId === "all" ? "all" : [selectedCollectionId]),
    [selectedCollectionId],
  );

  const availableTermCount = useMemo(
    () => countTermsForSelection(collections, domainIds),
    [collections, domainIds],
  );

  const maxQuestionCount = getMaxStudyCount(availableTermCount);

  useEffect(() => {
    setSavedSession(loadQuizSession());
  }, []);

  useEffect(() => {
    if (availableTermCount === 0) return;
    const newMax = getMaxStudyCount(availableTermCount);
    setQuestionCount(newMax);
    setQuestionCountInput(String(newMax));
    setQuestionCountError(null);
  }, [availableTermCount, selectedCollectionId]);

  useEffect(() => {
    if (
      !showQueuePreview ||
      step !== "picker" ||
      availableTermCount === 0 ||
      questionCountError !== null
    ) {
      setQueuePreview([]);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    void previewQuizQueueAction({ domainIds, questionCount }).then((result) => {
      if (cancelled) return;
      setPreviewLoading(false);
      if ("preview" in result && result.preview) {
        setQueuePreview(result.preview);
      } else {
        setQueuePreview([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [domainIds, questionCount, step, availableTermCount, questionCountError, showQueuePreview]);

  useEffect(() => {
    if (step !== "playing" || questions.length === 0) return;

    const currentSetup = {
      domainIds,
      questionCount: questions.length,
      questionStyle,
    };

    saveQuizSession({
      setup: currentSetup,
      questions,
      terms,
      currentIndex,
      answers,
      startedAt: sessionStartedAt,
    });
  }, [step, questions, terms, currentIndex, answers, domainIds, questionStyle, sessionStartedAt]);

  const termById = useMemo(() => new Map(terms.map((term) => [term.id, term])), [terms]);

  const correctSoFar = answers.filter((answer) => answer.passed).length;

  function handleResumeSession() {
    if (!savedSession) return;

    setQuestionStyle(savedSession.setup.questionStyle ?? "ai");
    setSelectedCollectionId(
      savedSession.setup.domainIds === "all" ? "all" : savedSession.setup.domainIds[0],
    );
    setQuestionCount(savedSession.setup.questionCount);
    setQuestionCountInput(String(savedSession.setup.questionCount));
    setQuestions(savedSession.questions);
    setTerms(savedSession.terms);
    setCurrentIndex(savedSession.currentIndex);
    setAnswers(savedSession.answers);
    setSessionStartedAt(savedSession.startedAt);
    setErrorMessage(null);
    setSavedSession(null);
    setStep("playing");
  }

  function handleDiscardSession() {
    clearQuizSession();
    setSavedSession(null);
  }

  function resetQuizState() {
    clearQuizSession();
    setSavedSession(null);
    setQuestions([]);
    setTerms([]);
    setCurrentIndex(0);
    setAnswers([]);
    setFlippedTerms([]);
    setFlippedTermIds([]);
    setResultsScore(null);
    setErrorMessage(null);
    setStep("picker");
    setSessionStartedAt(new Date().toISOString());
  }

  async function handleStartQuiz() {
    if (questionStyle === "ai" && !llmConfigured) {
      setErrorMessage("Add a provider and API key in Settings to generate AI quizzes.");
      return;
    }

    clearQuizSession();
    setSavedSession(null);
    setErrorMessage(null);
    setStep("generating");
    setSessionStartedAt(new Date().toISOString());

    const result = await generateQuizAction({
      domainIds,
      questionCount,
      questionStyle,
    });

    if ("error" in result) {
      setErrorMessage(result.error);
      setStep("error");
      return;
    }

    setQuestions(result.questions);
    setTerms(result.terms);
    setCurrentIndex(0);
    setAnswers([]);
    setFlippedTermIds([]);
    setFlippedTerms([]);
    setStep("playing");
  }

  async function handleQuestionAnswer(passed: boolean) {
    const question = questions[currentIndex];

    const answerResult = await recordQuizAnswerAction({
      termId: question.termId,
      passed,
    });

    if (answerResult.error) {
      setErrorMessage(answerResult.error);
      setStep("error");
      return;
    }

    const nextAnswers = [...answers, { termId: question.termId, passed }];
    const nextFlippedIds = answerResult.flipped
      ? [...new Set([...flippedTermIds, question.termId])]
      : flippedTermIds;

    setAnswers(nextAnswers);
    setFlippedTermIds(nextFlippedIds);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    const result = await submitQuizResultsAction({
      answers: nextAnswers,
      flippedTermIds: nextFlippedIds,
    });

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
    clearQuizSession();
    setSavedSession(null);
    setStep("results");
  }

  const score = resultsScore?.score ?? answers.filter((answer) => answer.passed).length;
  const resultsTotal = resultsScore?.total ?? questions.length;
  const aiRequiresSetup = questionStyle === "ai" && !llmConfigured;
  const questionCountPresets = questionCountPresetValues(maxQuestionCount);

  function applyQuestionCount(value: number) {
    setQuestionCount(value);
    setQuestionCountInput(String(value));
    setQuestionCountError(null);
  }

  return (
    <>
      {step === "picker" ? (
        <QuizPanel className="flex max-h-full min-h-0 w-full flex-col">
          {collections.length === 0 ? (
            <QuizPanelBody>
              <QuizCenteredState
                icon={AlertCircle}
                title="No active collections"
                description="Turn on a collection on the collection page before you take a quiz."
              >
                <LinkButton href="/jargon" variant="outline" className="min-h-11">
                  Collections
                </LinkButton>
              </QuizCenteredState>
            </QuizPanelBody>
          ) : availableTermCount === 0 && !savedSession ? (
            <QuizPanelBody>
              <QuizCenteredState
                icon={AlertCircle}
                title="No known terms yet"
                description="Quiz only checks terms you've marked known. Mark some known in Review or on the collection page, then come back."
              >
                <LinkButton href="/jargon/review" variant="outline" className="min-h-11">
                  Review
                </LinkButton>
              </QuizCenteredState>
            </QuizPanelBody>
          ) : (
            <>
              <QuizPanelBody className="min-h-0 flex-1 overflow-y-auto">
                <QuizPanelLabel
                  title="Set up your quiz"
                  description="Pick which collection to pull from — Quiz checks terms you've already marked known."
                />
                {savedSession ? (
                  <Alert>
                    <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        You have a quiz in progress — question{" "}
                        <span className="tabular-nums">{savedSession.currentIndex + 1}</span> of{" "}
                        <span className="tabular-nums">{savedSession.questions.length}</span>.
                      </span>
                      <span className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onPress={handleResumeSession}
                          className="max-md:min-h-11"
                        >
                          Resume
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onPress={handleDiscardSession}
                          className="max-md:min-h-11"
                        >
                          Start new
                        </Button>
                      </span>
                    </AlertDescription>
                  </Alert>
                ) : null}

                <fieldset className="flex flex-col gap-2 border-0 p-0">
                  <legend className="mb-2 text-sm font-medium leading-none">Question style</legend>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onPress={() => {
                        setQuestionStyle("simple");
                        setErrorMessage(null);
                      }}
                      aria-pressed={questionStyle === "simple"}
                      className={cn(
                        "min-h-11 flex-1",
                        questionStyle === "simple" &&
                          "border-primary bg-primary/10 text-primary hover:bg-primary/15",
                      )}
                    >
                      Simple
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onPress={() => setQuestionStyle("ai")}
                      aria-pressed={questionStyle === "ai"}
                      className={cn(
                        "min-h-11 flex-1",
                        questionStyle === "ai" &&
                          "border-primary bg-primary/10 text-primary hover:bg-primary/15",
                      )}
                    >
                      AI
                    </Button>
                  </div>
                  <p className="m-0 text-xs leading-relaxed text-base-content/60">
                    {questionStyle === "simple"
                      ? "See the definition and pick the correct term."
                      : "Comprehension-based questions generated by AI."}
                  </p>
                </fieldset>

                {aiRequiresSetup ? (
                  <Alert variant="destructive" className="max-w-md">
                    <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        AI quizzes need a provider and API key in Settings. Choose simple mode, or
                        set up an LLM provider.
                      </span>
                      <LinkButton
                        href="/jargon/settings"
                        size="sm"
                        variant="outline"
                        className="max-md:min-h-11"
                      >
                        Go to Settings
                      </LinkButton>
                    </AlertDescription>
                  </Alert>
                ) : null}

                {errorMessage && step === "picker" ? (
                  <Alert variant="destructive" className="max-w-md">
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                ) : null}

                <Field>
                  <FieldLabel htmlFor="quiz-collection">Collection</FieldLabel>
                  <Select
                    selectedKey={selectedCollectionId}
                    onSelectionChange={(key) => setSelectedCollectionId(String(key))}
                  >
                    <SelectTrigger id="quiz-collection" size="sm" className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem id="all">
                        All active collections ({allCollectionsTermCount(collections)})
                      </SelectItem>
                      {collections.map((collection) => (
                        <SelectItem key={collection.id} id={collection.id}>
                          {collection.name} ({collection.knownCount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <QuizStat
                  value={
                    availableTermCount === 1
                      ? "1 term available"
                      : `${availableTermCount} terms available`
                  }
                />

                <Field>
                  <FieldLabel htmlFor="quiz-question-count">How many questions</FieldLabel>
                  <div className="flex w-full items-stretch gap-2">
                    {questionCountPresets.map((preset) => {
                      const selected = questionCount === preset && questionCountError === null;
                      return (
                        <Button
                          key={preset}
                          type="button"
                          variant="outline"
                          onPress={() => applyQuestionCount(preset)}
                          isDisabled={availableTermCount === 0}
                          aria-pressed={selected}
                          className={cn(
                            "min-h-11 tabular-nums",
                            selected &&
                              "border-primary bg-primary/10 text-primary hover:bg-primary/15",
                          )}
                        >
                          {preset}
                        </Button>
                      );
                    })}
                    <Input
                      id="quiz-question-count"
                      type="text"
                      inputMode="numeric"
                      value={questionCountInput}
                      onChange={(event) => {
                        const value = event.target.value;
                        setQuestionCountInput(value);

                        if (value === "") {
                          setQuestionCountError(null);
                          return;
                        }

                        const parsed = Number.parseInt(value, 10);
                        if (Number.isNaN(parsed) || parsed < 1 || parsed > maxQuestionCount) {
                          setQuestionCountError(
                            `Please enter a number between 1 and ${maxQuestionCount}`,
                          );
                        } else {
                          setQuestionCount(parsed);
                          setQuestionCountError(null);
                        }
                      }}
                      disabled={availableTermCount === 0}
                      className="min-h-11 min-w-16 flex-1 tabular-nums"
                    />
                  </div>
                  <FieldDescription>
                    {questionCountError ? (
                      <span className="text-error">{questionCountError}</span>
                    ) : (
                      <>
                        Choose 1–{maxQuestionCount || 1}
                        {availableTermCount > MAX_STUDY_TERMS
                          ? ` (${MAX_STUDY_TERMS} max per quiz).`
                          : "."}
                      </>
                    )}
                  </FieldDescription>
                </Field>

                {showQueuePreview && availableTermCount > 0 && questionCountError === null ? (
                  <AdminOnly>
                    <QueuePreview
                      items={queuePreview}
                      context="quiz"
                      loading={previewLoading}
                      emptyMessage={NOTHING_ELIGIBLE_MESSAGE}
                    />
                  </AdminOnly>
                ) : null}

                {availableTermCount === 0 ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      No known terms in this collection. Mark some known in Review or on the
                      collection page.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </QuizPanelBody>
              <QuizSetupFooter
                className="sticky bottom-0 shrink-0 bg-base-100 px-5 py-4 sm:px-6"
                hint={
                  questionStyle === "simple" ? (
                    <>Uses terms from your collections — no AI needed.</>
                  ) : (
                    <>Uses {providerLabel ?? "your LLM provider"} — this may take a moment.</>
                  )
                }
              >
                <Button
                  type="button"
                  onPress={handleStartQuiz}
                  isDisabled={
                    availableTermCount === 0 || questionCountError !== null || aiRequiresSetup
                  }
                  className="min-h-11 w-full"
                >
                  Start quiz
                </Button>
              </QuizSetupFooter>
            </>
          )}
        </QuizPanel>
      ) : null}

      {step === "generating" ? (
        <QuizPanel className="flex min-h-0 flex-1 flex-col">
          <QuizPanelBody className="flex min-h-0 flex-1 items-center justify-center">
            <QuizCenteredState
              icon={Loader2}
              iconClassName="animate-spin"
              title={questionStyle === "simple" ? "Preparing your quiz" : "Building your quiz"}
              description={
                questionStyle === "simple"
                  ? `Setting up ${questionCount} question${questionCount === 1 ? "" : "s"}…`
                  : `Writing ${questionCount} question${questionCount === 1 ? "" : "s"}… This usually takes a few seconds.`
              }
            />
          </QuizPanelBody>
        </QuizPanel>
      ) : null}

      {step === "playing" && questions[currentIndex] ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <QuizProgress className="shrink-0" current={currentIndex + 1} total={questions.length} />
          <QuizQuestionView
            key={`${questions[currentIndex].termId}-${currentIndex}`}
            question={questions[currentIndex]}
            termLabel={termById.get(questions[currentIndex].termId)?.term ?? "Term"}
            current={currentIndex + 1}
            total={questions.length}
            correct={correctSoFar}
            isLast={currentIndex + 1 === questions.length}
            onAnswer={handleQuestionAnswer}
          />
        </div>
      ) : null}

      {step === "results" ? (
        <QuizResults
          score={score}
          total={resultsTotal}
          flippedTerms={flippedTerms}
          onQuizAgain={resetQuizState}
        />
      ) : null}

      {step === "error" ? (
        <QuizPanel className="flex min-h-0 flex-1 flex-col">
          <QuizPanelHeader
            icon={AlertCircle}
            title="Quiz didn't finish"
            description="Something interrupted the quiz."
          />
          <QuizPanelBody className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {errorMessage ?? "Couldn't complete the quiz. Try again."}
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button type="button" variant="outline" onPress={resetQuizState} className="min-h-11">
                Try again
              </Button>
              <LinkButton href="/jargon/settings" variant="ghost" className="min-h-11">
                Check settings
              </LinkButton>
            </div>
          </QuizPanelBody>
        </QuizPanel>
      ) : null}
    </>
  );
}
