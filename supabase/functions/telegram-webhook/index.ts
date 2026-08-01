/**
 * Thin Telegram webhook proxy:
 * verify secret → dismiss keyboard → forward to Next.js → execute actions.
 */

import { dismissInlineKeyboard } from "../_shared/inline-keyboard-tracker.ts";
import { getAppBaseUrl, getInternalSecret, getWebhookSecret } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase-admin.ts";
import {
  executeTelegramActions,
  sendTypingAction,
  type TelegramAction,
} from "../_shared/telegram-api.ts";

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

function normalizeUpdate(update: TelegramUpdate) {
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message?.chat.id;
    const messageId = cb.message?.message_id;
    if (chatId == null || messageId == null) {
      return {
        callbackQuery: {
          id: cb.id,
          data: cb.data ?? "",
          chatId: chatId ?? 0,
          messageId: messageId ?? 0,
          messageText: cb.message?.text,
        },
      };
    }
    return {
      callbackQuery: {
        id: cb.id,
        data: cb.data ?? "",
        chatId,
        messageId,
        messageText: cb.message?.text,
      },
    };
  }

  if (update.message?.text) {
    return {
      message: {
        chatId: update.message.chat.id,
        text: update.message.text,
      },
    };
  }

  return {};
}

async function callNextHandle(payload: unknown): Promise<TelegramAction[]> {
  const base = getAppBaseUrl();
  const response = await fetch(`${base}/api/internal/telegram/handle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getInternalSecret()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Next /api/internal/telegram/handle failed", {
      status: response.status,
      body,
      appBaseUrl: base,
    });
    throw new Error(`Next handle failed (${response.status}): ${body}`);
  }

  const json = (await response.json()) as { actions?: TelegramAction[] };
  return json.actions ?? [];
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
    const normalized = normalizeUpdate(update);

    if (!normalized.message && !normalized.callbackQuery) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const chatId = normalized.callbackQuery?.chatId ?? normalized.message?.chatId;
    if (chatId) {
      await sendTypingAction(chatId);
    }

    const supabase = createServiceClient();

    if (normalized.callbackQuery?.chatId && normalized.callbackQuery.messageId) {
      await dismissInlineKeyboard(
        supabase,
        normalized.callbackQuery.chatId,
        normalized.callbackQuery.messageId,
      );
    }

    const actions = await callNextHandle(normalized);
    await executeTelegramActions(actions, supabase);

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
