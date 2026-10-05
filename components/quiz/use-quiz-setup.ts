import { useMemo, useState } from "react";
import { studyCountPresetValues } from "@/lib/study/count";
import { type StudyCollection } from "@/lib/study/types";
import { maxQuizQuestions } from "@/lib/quiz/question-limit";
import { countTermsForSelection } from "@/lib/quiz/terms";
import {
  questionCountFor,
  quizSetupToSave,
  saveQuizSetupPreference,
  type InitialQuizSetup,
} from "@/lib/quiz/setup-preference";
import type { QuizQuestionStyle } from "@/lib/quiz/types";

export type QuizStep = "picker" | "generating" | "playing" | "results" | "error";

function domainIdsFor(collectionId: string): "all" | string[] {
  return collectionId === "all" ? "all" : [collectionId];
}

export function useQuizSetup(collections: StudyCollection[], initial: InitialQuizSetup) {
  const maxFor = (collectionId: string, style: QuizQuestionStyle) =>
    maxQuizQuestions(style, countTermsForSelection(collections, domainIdsFor(collectionId)));

  const [step, setStep] = useState<QuizStep>("picker");
  const [questionStyle, setQuestionStyleState] = useState<QuizQuestionStyle>(initial.style);
  const [selectedCollectionId, setSelectedCollectionIdState] = useState(initial.collectionId);
  const [collectionChanged, setCollectionChanged] = useState(false);
  // The count the user asked for; the field shows it capped to the
  // collection's size, so switching collections never loses it.
  const [preferredCount, setPreferredCount] = useState<number | null>(initial.count);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(() =>
    questionCountFor(initial.count, maxFor(initial.collectionId, initial.style)),
  );
  const [questionCountInput, setQuestionCountInput] = useState(() => String(questionCount));
  const [questionCountError, setQuestionCountError] = useState<string | null>(null);

  const domainIds = useMemo(() => domainIdsFor(selectedCollectionId), [selectedCollectionId]);

  const availableTermCount = useMemo(
    () => countTermsForSelection(collections, domainIds),
    [collections, domainIds],
  );

  const maxQuestionCount = maxQuizQuestions(questionStyle, availableTermCount);

  function showQuestionCount(value: number) {
    setQuestionCount(value);
    setQuestionCountInput(String(value));
    setQuestionCountError(null);
  }

  function setSelectedCollectionId(collectionId: string) {
    setSelectedCollectionIdState(collectionId);
    setCollectionChanged(true);
    showQuestionCount(questionCountFor(preferredCount, maxFor(collectionId, questionStyle)));
  }

  function setQuestionStyle(style: QuizQuestionStyle) {
    setQuestionStyleState(style);
    showQuestionCount(questionCountFor(preferredCount, maxFor(selectedCollectionId, style)));
  }

  function applyQuestionCount(value: number) {
    setPreferredCount(value);
    showQuestionCount(value);
  }

  function handleQuestionCountInputChange(value: string) {
    setQuestionCountInput(value);

    if (value === "") {
      setQuestionCountError(null);
      return;
    }

    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > maxQuestionCount) {
      setQuestionCountError(`Please enter a number between 1 and ${maxQuestionCount}`);
    } else {
      setQuestionCount(parsed);
      setPreferredCount(parsed);
      setQuestionCountError(null);
    }
  }

  function saveSetup() {
    saveQuizSetupPreference(
      quizSetupToSave({
        style: questionStyle,
        preferredCount,
        selectedCollectionId,
        collectionChanged,
        initial,
      }),
    );
  }

  const questionCountPresets = studyCountPresetValues(maxQuestionCount);

  return {
    step,
    setStep,
    questionStyle,
    setQuestionStyle,
    selectedCollectionId,
    setSelectedCollectionId,
    errorMessage,
    setErrorMessage,
    questionCount,
    setQuestionCount,
    questionCountInput,
    setQuestionCountInput,
    questionCountError,
    domainIds,
    availableTermCount,
    questionCountPresets,
    applyQuestionCount,
    handleQuestionCountInputChange,
    saveSetup,
  };
}
