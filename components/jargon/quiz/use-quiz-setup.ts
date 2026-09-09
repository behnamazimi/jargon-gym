import { useEffect, useMemo, useState } from "react";
import { getMaxStudyCount, studyCountPresetValues } from "@/lib/study/count";
import { type StudyCollection } from "@/lib/study/types";
import { countTermsForSelection } from "@/lib/quiz/terms";
import type { QuizQuestionStyle } from "@/lib/quiz/types";

export type QuizStep = "picker" | "generating" | "playing" | "results" | "error";

export function useQuizSetup(collections: StudyCollection[], initialDomainId?: string) {
  const [step, setStep] = useState<QuizStep>("picker");
  const [questionStyle, setQuestionStyle] = useState<QuizQuestionStyle>("simple");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(
    initialDomainId ?? "all",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(1);
  const [questionCountInput, setQuestionCountInput] = useState("1");
  const [questionCountError, setQuestionCountError] = useState<string | null>(null);

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
    if (availableTermCount === 0) return;
    const newMax = getMaxStudyCount(availableTermCount);
    setQuestionCount(newMax);
    setQuestionCountInput(String(newMax));
    setQuestionCountError(null);
  }, [availableTermCount, selectedCollectionId]);

  function applyQuestionCount(value: number) {
    setQuestionCount(value);
    setQuestionCountInput(String(value));
    setQuestionCountError(null);
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
      setQuestionCountError(null);
    }
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
    maxQuestionCount,
    questionCountPresets,
    applyQuestionCount,
    handleQuestionCountInputChange,
  };
}
