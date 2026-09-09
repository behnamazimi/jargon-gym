import { escapeText } from "entities";
import type { InlineKeyboardMarkup } from "./actions";

function buildSetupCollectionKeyboard(
  prefix: string,
  collections: Array<{ id: string; name: string; count: number }>,
  allCount: number,
): InlineKeyboardMarkup {
  const rows: InlineKeyboardMarkup["inline_keyboard"] = [
    [{ text: `All collections (${allCount})`, callback_data: `${prefix}:domain:all` }],
  ];

  for (let i = 0; i < collections.length; i += 2) {
    const row: InlineKeyboardMarkup["inline_keyboard"][number] = [
      {
        text: `${collections[i].name} (${collections[i].count})`,
        callback_data: `${prefix}:domain:${collections[i].id}`,
      },
    ];
    if (i + 1 < collections.length) {
      row.push({
        text: `${collections[i + 1].name} (${collections[i + 1].count})`,
        callback_data: `${prefix}:domain:${collections[i + 1].id}`,
      });
    }
    rows.push(row);
  }

  return { inline_keyboard: rows };
}

function buildSetupCountKeyboard(prefix: string, maxCount: number): InlineKeyboardMarkup {
  const presets = [5, 10, 15, 20, 30].filter((value) => value <= maxCount);
  const uniquePresets = [...new Set(presets)];
  const rows: InlineKeyboardMarkup["inline_keyboard"] = [];

  for (let i = 0; i < uniquePresets.length; i += 3) {
    rows.push(
      uniquePresets.slice(i, i + 3).map((value) => ({
        text: String(value),
        callback_data: `${prefix}:count:${value}`,
      })),
    );
  }

  if (maxCount > 0) {
    rows.push([{ text: `All (${maxCount})`, callback_data: `${prefix}:count:all` }]);
  }

  return { inline_keyboard: rows };
}

export function buildQuizCollectionKeyboard(
  collections: Array<{ id: string; name: string; count: number }>,
  allCount: number,
): InlineKeyboardMarkup {
  return buildSetupCollectionKeyboard("quizsetup", collections, allCount);
}

export function buildQuizCountKeyboard(maxCount: number): InlineKeyboardMarkup {
  return buildSetupCountKeyboard("quizsetup", maxCount);
}

export function buildReviewSetupCollectionKeyboard(
  collections: Array<{ id: string; name: string; count: number }>,
  allCount: number,
): InlineKeyboardMarkup {
  return buildSetupCollectionKeyboard("reviewsetup", collections, allCount);
}

export function buildReviewSetupCountKeyboard(maxCount: number): InlineKeyboardMarkup {
  return buildSetupCountKeyboard("reviewsetup", maxCount);
}

export function formatQuizSetupCollectionPrompt(): string {
  return "<b>Which collection?</b>\n\nNumbers show available terms for your selection.";
}

export function formatQuizSetupCountPrompt(maxCount: number, defaultCount: number): string {
  return (
    `<b>How many questions?</b>\n\n` +
    `Reply with a number from 1 to ${maxCount}, tap a button, or send nothing for ${defaultCount}.`
  );
}

export function formatSetupPromptWithAnswer(prompt: string, choice: string): string {
  return `${prompt}\n\n<b>Your choice:</b> ${escapeText(choice)}`;
}

export function formatReviewSetupCollectionPrompt(): string {
  return "<b>Which collection?</b>\n\nNumbers show available terms for your selection.";
}

export function formatReviewSetupCountPrompt(maxCount: number, defaultCount: number): string {
  return (
    `<b>How many cards?</b>\n\n` +
    `Reply with a number from 1 to ${maxCount}, tap a button, or send nothing for ${defaultCount}.`
  );
}
