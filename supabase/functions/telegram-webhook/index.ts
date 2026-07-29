import {
  CONNECT_MESSAGE,
  HELP_MESSAGE,
  MARKED_KNOWN_SUFFIX,
  WELCOME_MESSAGE,
} from "../_shared/constants.ts";
import { dismissInlineKeyboard } from "../_shared/inline-keyboard-tracker.ts";
import { getWebhookSecret } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase-admin.ts";
import {
  answerCallbackQuery,
  editMessageText,
  formatMaskedTermMessage,
  formatStatsMessage,
  sendMessage,
} from "../_shared/telegram-api.ts";
import { hashLinkToken } from "../_shared/token.ts";
import {
  fetchCollectionStats,
  fetchTermById,
  resolveUserIdByChatId,
  sendTermCard,
  sendTermOrCaughtUp,
} from "../_shared/term-service.ts";
import {
  handleQuizCommand,
  handleQuizSetupCallback,
  handleQuizSetupText,
  handleReviewAnswer,
} from "../_shared/review-service.ts";

type TelegramUpdate = {
  message?: {
    chat: { id: number };
    text?: string;
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: {
      chat: { id: number };
      message_id: number;
      text?: string;
    };
  };
};

function verifyWebhookSecret(request: Request) {
  const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  return secret === getWebhookSecret();
}

function parseStartToken(text: string): string | null {
  const match = text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
  return match?.[1]?.trim() ?? null;
}

function isNextCommand(text: string): boolean {
  return /^\/next(?:@\w+)?$/i.test(text.trim());
}

function isStatCommand(text: string): boolean {
  return /^\/stat(?:s)?(?:@\w+)?$/i.test(text.trim());
}

function isQuizCommand(text: string): boolean {
  return /^\/quiz(?:@\w+)?(?:\s+.*)?$/i.test(text.trim());
}

async function handleStart(chatId: number, token: string | null) {
  const supabase = createServiceClient();

  if (!token) {
    await sendMessage(chatId, CONNECT_MESSAGE);
    return;
  }

  const tokenHash = await hashLinkToken(token);
  const { data: userId, error } = await supabase.rpc("complete_telegram_link", {
    p_token_hash: tokenHash,
    p_chat_id: chatId,
  });

  if (error) {
    const message = error.message.includes("already linked")
      ? "This Telegram account is already linked to another Jargon Gym user."
      : "That link is invalid or expired. Generate a new one in Jargon Gym settings.";
    await sendMessage(chatId, message);
    return;
  }

  if (!userId) {
    await sendMessage(chatId, CONNECT_MESSAGE);
    return;
  }

  await sendMessage(chatId, WELCOME_MESSAGE);
}

async function handleNext(chatId: number) {
  const supabase = createServiceClient();
  const userId = await resolveUserIdByChatId(supabase, chatId);

  if (!userId) {
    await sendMessage(chatId, CONNECT_MESSAGE);
    return;
  }

  await sendTermOrCaughtUp(supabase, userId, chatId);
}

async function handleStat(chatId: number) {
  const supabase = createServiceClient();
  const userId = await resolveUserIdByChatId(supabase, chatId);

  if (!userId) {
    await sendMessage(chatId, CONNECT_MESSAGE);
    return;
  }

  const stats = await fetchCollectionStats(supabase, userId);
  const message = formatStatsMessage(stats);
  await sendMessage(chatId, message);
}

async function handleQuiz(chatId: number, text: string) {
  const supabase = createServiceClient();
  const userId = await resolveUserIdByChatId(supabase, chatId);

  if (!userId) {
    await sendMessage(chatId, CONNECT_MESSAGE);
    return;
  }

  await handleQuizCommand(supabase, chatId, userId, text);
}

async function handleCallback(callback: NonNullable<TelegramUpdate["callback_query"]>) {
  const chatId = callback.message?.chat.id;
  const messageId = callback.message?.message_id;
  const data = callback.data ?? "";

  if (!chatId || !messageId) {
    await answerCallbackQuery(callback.id);
    return;
  }

  const supabase = createServiceClient();

  await dismissInlineKeyboard(supabase, chatId, messageId);

  const userId = await resolveUserIdByChatId(supabase, chatId);

  if (!userId) {
    await answerCallbackQuery(callback.id, "Connect in Jargon Gym settings first.");
    await sendMessage(chatId, CONNECT_MESSAGE);
    return;
  }

  // Handle quiz setup wizard callbacks
  if (data.startsWith("quizsetup:")) {
    await answerCallbackQuery(callback.id);
    await handleQuizSetupCallback(supabase, chatId, userId, data);
    return;
  }

  // Handle quiz session callbacks
  if (data.startsWith("quiz:")) {
    const parts = data.slice("quiz:".length).split(":");
    if (parts.length === 2) {
      const sessionIndex = parseInt(parts[0], 10);
      const selectedTermId = parts[1];

      await answerCallbackQuery(callback.id);
      await handleReviewAnswer(supabase, chatId, messageId, sessionIndex, selectedTermId);
      return;
    }
  }

  if (data.startsWith("known:")) {
    const termId = data.slice("known:".length);
    const { error } = await supabase.rpc("mark_term_known", {
      p_user_id: userId,
      p_term_id: termId,
    });

    if (error) {
      await answerCallbackQuery(callback.id, "Could not mark that term.");
      return;
    }

    const term = await fetchTermById(supabase, userId, termId);
    const updatedText = term
      ? `${formatMaskedTermMessage(term)}${MARKED_KNOWN_SUFFIX}`
      : `${callback.message?.text ?? ""}${MARKED_KNOWN_SUFFIX}`;

    await editMessageText(chatId, messageId, updatedText, { inline_keyboard: [] }, supabase);
    await answerCallbackQuery(callback.id, "Marked as known.");
    return;
  }

  if (data.startsWith("skip:")) {
    await answerCallbackQuery(callback.id);
    await sendTermCard(supabase, userId, chatId);
    return;
  }

  await answerCallbackQuery(callback.id);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!verifyWebhookSecret(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const update = (await request.json()) as TelegramUpdate;

    if (update.callback_query) {
      await handleCallback(update.callback_query);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const message = update.message;
    if (!message?.text) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    if (text.startsWith("/start")) {
      await handleStart(chatId, parseStartToken(text));
    } else if (isNextCommand(text)) {
      await handleNext(chatId);
    } else if (isStatCommand(text)) {
      await handleStat(chatId);
    } else if (isQuizCommand(text)) {
      await handleQuiz(chatId, text);
    } else {
      const supabase = createServiceClient();
      const userId = await resolveUserIdByChatId(supabase, chatId);
      if (userId) {
        const handledSetup = await handleQuizSetupText(supabase, chatId, userId, text);
        if (!handledSetup) {
          await sendMessage(chatId, HELP_MESSAGE);
        }
      } else {
        await sendMessage(chatId, CONNECT_MESSAGE);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("telegram-webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
