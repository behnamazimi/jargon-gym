import { type StudyCollection } from "@/lib/study/types";
import { useQuizSetup } from "@/components/jargon/quiz/use-quiz-setup";
import { useQuizPlaying } from "@/components/jargon/quiz/use-quiz-playing";

export function useQuizSession(collections: StudyCollection[], initialDomainId?: string) {
  const setup = useQuizSetup(collections, initialDomainId);
  const playing = useQuizPlaying({
    step: setup.step,
    setStep: setup.setStep,
    questionStyle: setup.questionStyle,
    setQuestionStyle: setup.setQuestionStyle,
    setSelectedCollectionId: setup.setSelectedCollectionId,
    setQuestionCount: setup.setQuestionCount,
    setQuestionCountInput: setup.setQuestionCountInput,
    setErrorMessage: setup.setErrorMessage,
    domainIds: setup.domainIds,
    questionCount: setup.questionCount,
  });

  return {
    step: setup.step,
    questionStyle: setup.questionStyle,
    setQuestionStyle: setup.setQuestionStyle,
    selectedCollectionId: setup.selectedCollectionId,
    setSelectedCollectionId: setup.setSelectedCollectionId,
    errorMessage: setup.errorMessage,
    setErrorMessage: setup.setErrorMessage,
    questionCount: setup.questionCount,
    questionCountInput: setup.questionCountInput,
    questionCountError: setup.questionCountError,
    domainIds: setup.domainIds,
    availableTermCount: setup.availableTermCount,
    maxQuestionCount: setup.maxQuestionCount,
    questionCountPresets: setup.questionCountPresets,
    applyQuestionCount: setup.applyQuestionCount,
    handleQuestionCountInputChange: setup.handleQuestionCountInputChange,

    questions: playing.questions,
    currentIndex: playing.currentIndex,
    savedSession: playing.savedSession,
    isSubmittingAnswer: playing.isSubmittingAnswer,
    pendingFinalAnswers: playing.pendingFinalAnswers,
    termById: playing.termById,
    correctSoFar: playing.correctSoFar,
    handleResumeSession: playing.handleResumeSession,
    handleDiscardSession: playing.handleDiscardSession,
    resetQuizState: playing.resetQuizState,
    handleStartQuiz: playing.handleStartQuiz,
    handleQuestionAnswer: playing.handleQuestionAnswer,
    handleRetrySubmit: playing.handleRetrySubmit,
    score: playing.score,
    resultsTotal: playing.resultsTotal,
  };
}
