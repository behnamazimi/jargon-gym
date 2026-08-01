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
  formatTermMessage,
  runWithTyping,
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
import { clearQuizSetup } from "../_shared/quiz-setup.ts";
import { deleteSession } from "../_shared/review-session.ts";
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
  if (!token) {
    await sendMessage(chatId, CONNECT_MESSAGE);
    return;
  }

  await runWithTyping(chatId, async () => {
    const supabase = createServiceClient();
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
  });
}

async function clearTelegramInteractionState(
  supabase: ReturnType<typeof createServiceClient>,
  chatId: number,
): Promise<void> {
  try {
    await clearQuizSetup(supabase, chatId);
  } catch (error) {
    console.error("Failed to clear quiz setup:", error);
  }

  try {
    await deleteSession(supabase, chatId);
  } catch (error) {
    console.error("Failed to clear quiz session:", error);
  }
}

async function handleNext(chatId: number) {
  await runWithTyping(chatId, async () => {
    const supabase = createServiceClient();
    const userId = await resolveUserIdByChatId(supabase, chatId);

    if (!userId) {
      await sendMessage(chatId, CONNECT_MESSAGE);
      return;
    }

    await clearTelegramInteractionState(supabase, chatId);

    try {
      await sendTermOrCaughtUp(supabase, userId, chatId);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error("handleNext error:", detail, error);
      await sendMessage(chatId, "Could not send a term right now. Try again in a moment.");
    }
  });
}

async function handleStat(chatId: number) {
  await runWithTyping(chatId, async () => {
    const supabase = createServiceClient();
    const userId = await resolveUserIdByChatId(supabase, chatId);

    if (!userId) {
      await sendMessage(chatId, CONNECT_MESSAGE);
      return;
    }

    const stats = await fetchCollectionStats(supabase, userId);
    const message = formatStatsMessage(stats);
    await sendMessage(chatId, message);
  });
}

async function handleQuiz(chatId: number, text: string) {
  await runWithTyping(chatId, async () => {
    const supabase = createServiceClient();
    const userId = await resolveUserIdByChatId(supabase, chatId);

    if (!userId) {
      await sendMessage(chatId, CONNECT_MESSAGE);
      return;
    }

    await handleQuizCommand(supabase, chatId, userId, text);
  });
}

async function handleCallback(callback: NonNullable<TelegramUpdate["callback_query"]>) {
  const chatId = callback.message?.chat.id;
  const messageId = callback.message?.message_id;
  const data = callback.data ?? "";

  if (!chatId || !messageId) {
    await answerCallbackQuery(callback.id);
    return;
  }

  await runWithTyping(chatId, async () => {
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
      await handleQuizSetupCallback(supabase, chatId, userId, data, messageId);
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

      // Record "solid" outcome (update only, seen already incremented on delivery)
      try {
        const { recordReviewOutcome } = await import("../_shared/smart-queue-service.ts");
        await recordReviewOutcome(supabase, userId, termId, "solid", false);
      } catch (err) {
        console.error("Failed to record solid outcome after mark known", { userId, termId, err });
      }

      const term = await fetchTermById(supabase, userId, termId);
      const updatedText = term
        ? `${formatMaskedTermMessage(term)}\n\n<b>Your action:</b> Mark known${MARKED_KNOWN_SUFFIX}`
        : `${callback.message?.text ?? ""}\n\n<b>Your action:</b> Mark known${MARKED_KNOWN_SUFFIX}`;

      await editMessageText(chatId, messageId, updatedText, { inline_keyboard: [] }, supabase);
      await answerCallbackQuery(callback.id, "Marked as known.");
      return;
    }

    if (data.startsWith("skip:")) {
      const termId = data.slice("skip:".length);

      // Record "skipped" outcome (update only, seen already incremented on delivery)
      try {
        const { recordReviewOutcome } = await import("../_shared/smart-queue-service.ts");
        await recordReviewOutcome(supabase, userId, termId, "skipped", false);
      } catch (err) {
        console.error("Failed to record skipped outcome", { userId, termId, err });
      }

      const term = await fetchTermById(supabase, userId, termId);

      if (term) {
        await editMessageText(
          chatId,
          messageId,
          `${formatTermMessage(term)}\n\n<b>Your action:</b> Skip`,
          { inline_keyboard: [] },
          supabase,
        );
      }

      await answerCallbackQuery(callback.id);
      await sendTermCard(supabase, userId, chatId);
      return;
    }

    await answerCallbackQuery(callback.id);
  });
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
      await runWithTyping(chatId, async () => {
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
      });
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
