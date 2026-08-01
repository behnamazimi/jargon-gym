import type { InlineKeyboardMarkup, TelegramAction } from "./actions";

export function send(
  chatId: number,
  text: string,
  replyMarkup?: InlineKeyboardMarkup,
  trackKeyboard = false,
): TelegramAction {
  return {
    type: "sendMessage",
    chatId,
    text,
    replyMarkup,
    trackKeyboard: trackKeyboard || Boolean(replyMarkup),
  };
}

export function edit(
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: InlineKeyboardMarkup,
): TelegramAction {
  return {
    type: "editMessageText",
    chatId,
    messageId,
    text,
    replyMarkup: replyMarkup ?? { inline_keyboard: [] },
  };
}
