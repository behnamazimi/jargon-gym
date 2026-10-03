import type { InitialQuizSetup } from "@/lib/quiz/setup-preference";
import { type StudyCollection } from "@/lib/study/types";
import { useQuizSetup } from "@/components/quiz/use-quiz-setup";
import { useQuizPlaying } from "@/components/quiz/use-quiz-playing";

export function useQuizSession(collections: StudyCollection[], initialSetup: InitialQuizSetup) {
  const setup = useQuizSetup(collections, initialSetup);
  const playing = useQuizPlaying(setup);

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
    questionCountPresets: setup.questionCountPresets,
    applyQuestionCount: setup.applyQuestionCount,
    handleQuestionCountInputChange: setup.handleQuestionCountInputChange,
    saveSetup: setup.saveSetup,

    errorReason: playing.errorReason,
    questions: playing.questions,
    currentIndex: playing.currentIndex,
    savedSession: playing.savedSession,
    termById: playing.termById,
    correctSoFar: playing.correctSoFar,
    handleResumeSession: playing.handleResumeSession,
    resetQuizState: playing.resetQuizState,
    handleStartQuiz: playing.handleStartQuiz,
    handleQuestionAnswer: playing.handleQuestionAnswer,
    handleStartPractice: playing.handleStartPractice,
    practice: playing.practice,
    missedTerms: playing.missedTerms,
    score: playing.score,
    resultsTotal: playing.resultsTotal,
  };
}
