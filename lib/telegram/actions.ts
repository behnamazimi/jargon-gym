/** Action DTOs returned by Next.js; Edge executes them via Telegram Bot API. */

export type InlineKeyboardMarkup = {
  inline_keyboard: Array<
    Array<{ text: string; callback_data: string } | { text: string; url: string }>
  >;
};

export type TelegramAction =
  | {
      type: "sendMessage";
      chatId: number;
      text: string;
      replyMarkup?: InlineKeyboardMarkup;
      /** When true, Edge tracks this message as the active inline keyboard. */
      trackKeyboard?: boolean;
    }
  | {
      type: "editMessageText";
      chatId: number;
      messageId: number;
      text: string;
      replyMarkup?: InlineKeyboardMarkup;
    }
  | {
      type: "answerCallbackQuery";
      callbackQueryId: string;
      text?: string;
    }
  | {
      type: "typing";
      chatId: number;
    }
  | {
      type: "pause";
      chatId: number;
      ms: number;
    };
