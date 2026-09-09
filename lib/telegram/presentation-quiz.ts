import { escapeText } from "entities";
import type { TermCard } from "@/lib/jargon/term-card";
import type { InlineKeyboardMarkup } from "./actions";

export function formatReviewQuestion(
  term: TermCard,
  currentIndex: number,
  totalQuestions: number,
): string {
  let message = `<b>Question ${currentIndex + 1}/${totalQuestions}</b>\n\n`;
  message += `${escapeText(term.definition)}\n\n`;
  message += `<i>Category: ${escapeText(term.category)}</i> · ${escapeText(term.domainName)}`;
  return message;
}

export function formatReviewQuestionWithAnswer(
  term: TermCard,
  questionIndex: number,
  totalQuestions: number,
  selectedTerm: string,
  isCorrect: boolean,
  currentScore: number,
): string {
  let message = formatReviewQuestion(term, questionIndex, totalQuestions);
  message += `\n\n<b>Your answer:</b> ${escapeText(selectedTerm)}`;

  if (isCorrect) {
    message += `\n\n✅ <b>Correct!</b>`;
  } else {
    message += `\n\n❌ <b>Wrong.</b> The correct answer was: <b>${escapeText(term.term)}</b>`;
  }

  message += `\n\nScore: ${currentScore}/${totalQuestions}`;
  return message;
}

export function formatTrueFalseQuestion(
  term: TermCard,
  currentIndex: number,
  totalQuestions: number,
  scenarioText: string,
): string {
  let message = `<b>Question ${currentIndex + 1}/${totalQuestions}</b>\n\n`;
  message += `Does this illustrate "${escapeText(term.term)}"?\n\n`;
  message += `<blockquote>${escapeText(scenarioText)}</blockquote>`;
  return message;
}

export function formatTrueFalseQuestionWithAnswer(
  term: TermCard,
  questionIndex: number,
  totalQuestions: number,
  scenarioText: string,
  selectedAnswer: boolean,
  correctAnswer: boolean,
  isCorrect: boolean,
  currentScore: number,
): string {
  let message = formatTrueFalseQuestion(term, questionIndex, totalQuestions, scenarioText);
  message += `\n\n<b>Your answer:</b> ${selectedAnswer ? "True" : "False"}`;

  if (isCorrect) {
    message += `\n\n✅ <b>Correct!</b>`;
  } else {
    message += `\n\n❌ <b>Wrong.</b> The correct answer was: <b>${correctAnswer ? "True" : "False"}</b>`;
  }

  message += `\n\nScore: ${currentScore}/${totalQuestions}`;
  return message;
}

export function buildTrueFalseKeyboard(sessionIndex: number): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "True", callback_data: `quiztf:${sessionIndex}:true` },
        { text: "False", callback_data: `quiztf:${sessionIndex}:false` },
      ],
    ],
  };
}

export function buildReviewKeyboard(
  options: Array<{ id: string; term: string }>,
  sessionIndex: number,
): InlineKeyboardMarkup {
  const rows: InlineKeyboardMarkup["inline_keyboard"] = [];

  for (let i = 0; i < options.length; i += 2) {
    const row: InlineKeyboardMarkup["inline_keyboard"][number] = [
      {
        text: options[i].term,
        callback_data: `quiz:${sessionIndex}:${options[i].id}`,
      },
    ];
    if (i + 1 < options.length) {
      row.push({
        text: options[i + 1].term,
        callback_data: `quiz:${sessionIndex}:${options[i + 1].id}`,
      });
    }
    rows.push(row);
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
