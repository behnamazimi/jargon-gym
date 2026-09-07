"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  generateQuizAction,
  recordQuizAnswerAction,
  submitQuizResultsAction,
} from "@/app/(private)/jargon/quiz/actions";
import { QuizQuestionView } from "@/components/jargon/quiz/quiz-question";
import { QuizResults } from "@/components/jargon/quiz/quiz-results";
import {
  QuizCenteredState,
  QuizPanel,
  QuizPanelBody,
  QuizPanelHeader,
  QuizPanelLabel,
  QuizStat,
} from "@/components/jargon/quiz/quiz-ui";
import {
  StudyCollectionField,
  StudyCountField,
  StudyNoActiveCollectionsState,
  StudyResumeBanner,
  StudySetupPanel,
} from "@/components/jargon/study/study-setup-panel";
import { StudyProgress } from "@/components/jargon/study/study-progress";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { getMaxStudyCount, studyCountPresetValues } from "@/lib/study/count";
import { type StudyCollection } from "@/lib/study/types";
import { countTermsForSelection } from "@/lib/quiz/terms";
import { cn } from "@/lib/utils";
import type { QuizAnswer, QuizQuestion, QuizQuestionStyle, QuizTerm } from "@/lib/quiz/types";
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
  collections: StudyCollection[];
  initialDomainId?: string;
};

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
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

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
    setStep("playing");
  }

  async function handleQuestionAnswer(passed: boolean) {
    if (isSubmittingAnswer) return;
    setIsSubmittingAnswer(true);

    const question = questions[currentIndex];

    const answerResult = await recordQuizAnswerAction({
      termId: question.termId,
      passed,
      questionType: question.type,
    });

    if (answerResult.error) {
      setErrorMessage(answerResult.error);
      setStep("error");
      setIsSubmittingAnswer(false);
      return;
    }

    const nextAnswers = [...answers, { termId: question.termId, passed }];
    setAnswers(nextAnswers);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((index) => index + 1);
      setIsSubmittingAnswer(false);
      return;
    }

    const result = await submitQuizResultsAction();

    if (result.error) {
      setErrorMessage(result.error);
      setStep("error");
      setIsSubmittingAnswer(false);
      return;
    }

    setResultsScore({
      score: nextAnswers.filter((answer) => answer.passed).length,
      total: questions.length,
    });
    clearQuizSession();
    setSavedSession(null);
    setStep("results");
    setIsSubmittingAnswer(false);
  }

  const score = resultsScore?.score ?? answers.filter((answer) => answer.passed).length;
  const resultsTotal = resultsScore?.total ?? questions.length;
  const aiRequiresSetup = questionStyle === "ai" && !llmConfigured;
  const questionCountPresets = studyCountPresetValues(maxQuestionCount);

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
            <StudyNoActiveCollectionsState description="Turn on a collection on the collection page before you take a quiz." />
          ) : availableTermCount === 0 && !savedSession ? (
            <QuizPanelBody>
              <QuizCenteredState
                icon={AlertCircle}
                title="No terms yet"
                description="Add some terms to a collection, then come back to quiz yourself."
              >
                <LinkButton href="/jargon" variant="outline" className="min-h-11">
                  Collections
                </LinkButton>
              </QuizCenteredState>
            </QuizPanelBody>
          ) : (
            <StudySetupPanel
              footer={
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
              }
              footerHint={
                questionStyle === "simple" ? (
                  <>Uses terms from your collections — no AI needed.</>
                ) : (
                  <>Uses {providerLabel ?? "your LLM provider"} — this may take a moment.</>
                )
              }
            >
              <QuizPanelLabel
                title="Set up your quiz"
                description="Pick which collection to pull from — Quiz surfaces the terms most at risk of slipping first."
              />
              {savedSession ? (
                <StudyResumeBanner
                  message={
                    <>
                      You have a quiz in progress — question{" "}
                      <span className="tabular-nums">{savedSession.currentIndex + 1}</span> of{" "}
                      <span className="tabular-nums">{savedSession.questions.length}</span>.
                    </>
                  }
                  onResume={handleResumeSession}
                  onDiscard={handleDiscardSession}
                />
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
                  <AlertDescription>
                    AI quizzes need a provider and API key in Settings. Choose simple mode, or set
                    up an LLM provider.
                  </AlertDescription>
                  <AlertAction>
                    <LinkButton
                      href="/jargon/settings"
                      size="sm"
                      variant="outline"
                      className="max-md:min-h-11"
                    >
                      Go to Settings
                    </LinkButton>
                  </AlertAction>
                </Alert>
              ) : null}

              {errorMessage && step === "picker" ? (
                <Alert variant="destructive" className="max-w-md">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}

              <StudyCollectionField
                id="quiz-collection"
                collections={collections}
                value={selectedCollectionId}
                onChange={setSelectedCollectionId}
              />

              <QuizStat
                value={
                  availableTermCount === 1
                    ? "1 term available"
                    : `${availableTermCount} terms available`
                }
              />

              <StudyCountField
                id="quiz-question-count"
                label="How many questions"
                presets={questionCountPresets}
                selectedValue={questionCount}
                inputValue={questionCountInput}
                error={questionCountError}
                max={maxQuestionCount}
                availableCount={availableTermCount}
                perUnitLabel="quiz"
                onPresetSelect={applyQuestionCount}
                onInputChange={(value) => {
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
              />

              {availableTermCount === 0 ? (
                <Alert variant="destructive">
                  <AlertDescription>No terms in this collection yet.</AlertDescription>
                </Alert>
              ) : null}
            </StudySetupPanel>
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
          <StudyProgress
            className="shrink-0"
            current={currentIndex + 1}
            total={questions.length}
            unitLabel="Question"
          />
          <QuizQuestionView
            key={`${questions[currentIndex].termId}-${currentIndex}`}
            question={questions[currentIndex]}
            termLabel={termById.get(questions[currentIndex].termId)?.term ?? "Term"}
            current={currentIndex + 1}
            total={questions.length}
            correct={correctSoFar}
            isLast={currentIndex + 1 === questions.length}
            onAnswer={handleQuestionAnswer}
            isSubmitting={isSubmittingAnswer}
          />
        </div>
      ) : null}

      {step === "results" ? (
        <QuizResults score={score} total={resultsTotal} onQuizAgain={resetQuizState} />
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
