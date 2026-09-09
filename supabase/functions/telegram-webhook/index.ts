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

function normalizeCallbackQuery(cb: NonNullable<TelegramUpdate["callback_query"]>) {
  const chatId = cb.message?.chat.id;
  const messageId = cb.message?.message_id;
  return {
    id: cb.id,
    data: cb.data ?? "",
    chatId: chatId ?? 0,
    messageId: messageId ?? 0,
    messageText: cb.message?.text,
  };
}

function normalizeUpdate(update: TelegramUpdate) {
  if (update.callback_query) {
    return { callbackQuery: normalizeCallbackQuery(update.callback_query) };
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type NormalizedUpdate = ReturnType<typeof normalizeUpdate>;

async function dismissInlineKeyboardIfCallback(
  normalized: NormalizedUpdate,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<void> {
  if (normalized.callbackQuery?.chatId && normalized.callbackQuery.messageId) {
    await dismissInlineKeyboard(
      supabase,
      normalized.callbackQuery.chatId,
      normalized.callbackQuery.messageId,
    );
  }
}

async function processUpdate(normalized: NormalizedUpdate): Promise<Response> {
  if (!normalized.message && !normalized.callbackQuery) {
    return jsonResponse({ ok: true });
  }

  const chatId = normalized.callbackQuery?.chatId ?? normalized.message?.chatId;
  if (chatId) {
    await sendTypingAction(chatId);
  }

  const supabase = createServiceClient();
  await dismissInlineKeyboardIfCallback(normalized, supabase);

  const actions = await callNextHandle(normalized);
  await executeTelegramActions(actions, supabase);

  return jsonResponse({ ok: true });
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!verifyWebhookSecret(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const update = (await request.json()) as TelegramUpdate;
    return await processUpdate(normalizeUpdate(update));
  } catch (error) {
    console.error("telegram-webhook error:", error);
    return jsonResponse({ error: "Internal error" }, 500);
  }
}

Deno.serve(handleRequest);
