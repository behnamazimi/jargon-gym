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
import {
  clearQuizSession,
  loadQuizSession,
  saveQuizSession,
  type QuizSessionState,
} from "@/lib/quiz/session-storage";

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
  const [questionCount, setQuestionCount] = useState(1);
  const [questionCountInput, setQuestionCountInput] = useState("1");
  const [questionCountError, setQuestionCountError] = useState<string | null>(null);
  const [savedSession, setSavedSession] = useState<QuizSessionState | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string>(new Date().toISOString());

  const domainIds: "all" | string[] =
    selectedCollectionId === "all" ? "all" : [selectedCollectionId];

  const availableTermCount = useMemo(
    () => countTermsForSelection(collections, domainIds, status),
    [collections, domainIds, status],
  );

  const maxQuestionCount = getMaxQuizQuestionCount(availableTermCount);

  useEffect(() => {
    setSavedSession(loadQuizSession());
  }, []);

  useEffect(() => {
    if (availableTermCount === 0) return;
    const newMax = getMaxQuizQuestionCount(availableTermCount);
    setQuestionCount(newMax);
    setQuestionCountInput(String(newMax));
    setQuestionCountError(null);
  }, [availableTermCount, status, selectedCollectionId]);

  useEffect(() => {
    if (step !== "playing" || questions.length === 0) return;

    const currentSetup = {
      domainIds,
      status,
      questionCount: questions.length,
    };

    saveQuizSession({
      setup: currentSetup,
      questions,
      terms,
      currentIndex,
      answers,
      startedAt: sessionStartedAt,
    });
  }, [step, questions, terms, currentIndex, answers, domainIds, status, sessionStartedAt]);

  const termById = useMemo(() => new Map(terms.map((term) => [term.id, term])), [terms]);

  const correctSoFar = answers.filter((answer) => answer.passed).length;

  function handleResumeSession() {
    if (!savedSession) return;

    setStatus(savedSession.setup.status);
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
    setResultsScore(null);
    setErrorMessage(null);
    setStep("picker");
    setSessionStartedAt(new Date().toISOString());
  }

  async function handleStartQuiz() {
    clearQuizSession();
    setSavedSession(null);
    setErrorMessage(null);
    setStep("generating");
    setSessionStartedAt(new Date().toISOString());

    const result = await generateQuizAction({ domainIds, status, questionCount });

    if ("error" in result) {
      setErrorMessage(result.error);
      setStep("error");
      return;
    }

    setQuestions(result.questions);
    setTerms(result.terms);
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
    clearQuizSession();
    setSavedSession(null);
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
                title="Quiz provider not set up"
                description="Add a provider and API key in Settings to generate quizzes."
              >
                <LinkButton href="/jargon/settings">Go to Settings</LinkButton>
              </QuizCenteredState>
            </QuizPanelBody>
          ) : collections.length === 0 ? (
            <QuizPanelBody>
              <QuizCenteredState
                icon={AlertCircle}
                title="No active collections"
                description="Turn on a collection on the collection page before you take a quiz."
              >
                <BackToJargonLink />
              </QuizCenteredState>
            </QuizPanelBody>
          ) : (
            <>
              <QuizPanelHeader
                icon={Sparkles}
                title="Set up your quiz"
                description="Pick what to study and which collection to pull from."
              />
              <QuizPanelBody>
                {savedSession ? (
                  <Alert>
                    <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        You have a quiz in progress — question{" "}
                        <span className="tabular-nums">{savedSession.currentIndex + 1}</span> of{" "}
                        <span className="tabular-nums">{savedSession.questions.length}</span>.
                      </span>
                      <span className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" onPress={handleResumeSession}>
                          Resume
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onPress={handleDiscardSession}
                        >
                          Start new
                        </Button>
                      </span>
                    </AlertDescription>
                  </Alert>
                ) : null}

                <fieldset className="mb-4 flex max-w-md flex-col gap-2 border-0 p-0">
                  <legend className="text-sm font-medium leading-none mb-2">What to quiz</legend>
                  <div className="flex flex-col gap-3">
                    <QuizSetupOption
                      name="quiz-status"
                      value="unknown"
                      checked={status === "unknown"}
                      onChange={() => setStatus("unknown")}
                      title="Unknown terms"
                      description="Terms you haven't marked as known."
                    />
                    <QuizSetupOption
                      name="quiz-status"
                      value="known"
                      checked={status === "known"}
                      onChange={() => setStatus("known")}
                      title="Known terms"
                      description="Test yourself on terms you already know."
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
                    className="max-w-[8rem] tabular-nums"
                  />
                  <FieldDescription>
                    {questionCountError ? (
                      <span className="text-error">{questionCountError}</span>
                    ) : (
                      <>
                        Choose 1–{maxQuestionCount || 1}
                        {availableTermCount > MAX_QUIZ_TERMS
                          ? ` (${MAX_QUIZ_TERMS} max per quiz).`
                          : "."}
                      </>
                    )}
                  </FieldDescription>
                </Field>

                {availableTermCount === 0 ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      No {status} terms in your selection. Pick another option.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <QuizSetupFooter
                  hint={<>Uses {providerLabel ?? "your LLM provider"} — this may take a moment.</>}
                >
                  <Button
                    type="button"
                    onPress={handleStartQuiz}
                    isDisabled={availableTermCount === 0 || questionCountError !== null}
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
              description={`Writing ${questionCount} question${questionCount === 1 ? "" : "s"}… This usually takes a few seconds.`}
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
            title="Quiz didn't finish"
            description="Something interrupted the quiz."
          />
          <QuizPanelBody className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {errorMessage ?? "Couldn't complete the quiz. Try again."}
              </AlertDescription>
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
