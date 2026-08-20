import type { OverallStrength, PickReason } from "@/lib/smart-queue";
import type { StudyCollection } from "@/lib/study";

export type QuizQuestionStyle = "ai" | "simple";

export type QuizTerm = {
  id: string;
  term: string;
  definition: string;
  example: string | null;
  domainId: string;
  domainName: string;
  pickReasons?: PickReason[];
  /** Display-only mastery tier for this term in Quiz. Never affects scoring. */
  strength?: OverallStrength;
};

export type QuizMcqQuestion = {
  type: "multiple_choice";
  termId: string;
  prompt: string;
  options: { id: string; text: string }[];
  correctOptionIds: string[];
};

export type QuizTrueFalseQuestion = {
  type: "true_false";
  termId: string;
  prompt: string;
  correctAnswer: boolean;
};

export type QuizQuestion = QuizMcqQuestion | QuizTrueFalseQuestion;

export type QuizAnswer = {
  termId: string;
  passed: boolean;
};

/** @deprecated Prefer StudyCollection from @/lib/study */
export type QuizableCollection = StudyCollection;
