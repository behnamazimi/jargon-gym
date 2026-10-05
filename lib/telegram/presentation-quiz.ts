import { escapeText } from "entities";
import { quizFeedbackLine } from "@/lib/quiz/templates/registry";
import type { QuizQuestion } from "@/lib/quiz/types";
import type { InlineKeyboardMarkup } from "./actions";
import { quizOptions, type QuizTelegramOption } from "./quiz-options";

/** Buttons show the full answer unless some are long; then the answers are
 *  listed in the message and the buttons carry their numbers. */
const LONG_OPTION_LENGTH = 28;

function usesNumberedButtons(options: QuizTelegramOption[]): boolean {
  return options.some((option) => option.label.length > LONG_OPTION_LENGTH);
}

export function formatQuizQuestion(
  question: QuizQuestion,
  currentIndex: number,
  totalQuestions: number,
): string {
  let message = `<b>Question ${currentIndex + 1}/${totalQuestions}</b>\n\n`;
  message += escapeText(question.prompt);
  if (question.quote) message += `\n\n<blockquote>${escapeText(question.quote)}</blockquote>`;

  const options = quizOptions(question);
  if (question.interaction === "choice" && usesNumberedButtons(options)) {
    message += `\n\n${options.map((option, i) => `${i + 1}. ${escapeText(option.label)}`).join("\n")}`;
  }
  return message;
}

export function formatQuizQuestionWithAnswer(
  question: QuizQuestion,
  questionIndex: number,
  totalQuestions: number,
  selectedLabel: string,
  correctLabel: string,
  isCorrect: boolean,
  currentScore: number,
): string {
  let message = formatQuizQuestion(question, questionIndex, totalQuestions);
  message += `\n\n<b>Your answer:</b> ${escapeText(selectedLabel)}`;

  if (isCorrect) {
    message += `\n\n✅ <b>Correct!</b>`;
  } else {
    message += `\n\n❌ <b>Wrong.</b> The correct answer was: <b>${escapeText(correctLabel)}</b>`;
  }

  const feedback = quizFeedbackLine(question, isCorrect);
  if (feedback) message += `\n\n${escapeText(feedback)}`;

  message += `\n\nScore: ${currentScore}/${totalQuestions}`;
  return message;
}

export function buildQuizKeyboard(
  question: QuizQuestion,
  sessionIndex: number,
): InlineKeyboardMarkup {
  const options = quizOptions(question);
  const numbered = question.interaction === "choice" && usesNumberedButtons(options);
  const buttons = options.map((option, index) => ({
    text: numbered ? String(index + 1) : option.label,
    callback_data: `quiz:${sessionIndex}:${option.id}`,
  }));

  const rows: InlineKeyboardMarkup["inline_keyboard"] = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
  return { inline_keyboard: rows };
}

export function formatReviewSummary(score: number, total: number): string {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  let message = `📊 <b>Quiz Complete!</b>\n\n`;
  message += `Score: ${score}/${total} (${percentage}%)\n\n`;

  if (percentage === 100) message += "🎉 Perfect score! Excellent work!";
  else if (percentage >= 80) message += "🌟 Great job! You know these terms well!";
  else if (percentage >= 60) message += "👍 Good effort! Keep practicing!";
  else message += "💪 Keep studying! You'll improve with practice!";

  return message;
}
