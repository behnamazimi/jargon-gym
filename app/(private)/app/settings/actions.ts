"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAiAccessView } from "@/lib/llm/access";
import { clearLlmSettings, getUserSettings, saveLlmSettings } from "@/lib/llm/settings";
import type { LlmProvider } from "@/lib/llm/types";
import {
  createOrRefreshTelegramLink,
  disconnectTelegram,
  getTelegramLinkStatus,
  updateTelegramCadence,
} from "@/lib/telegram/links";
import type { TelegramCadence } from "@/lib/telegram/types";
import { createWidgetToken, listWidgetTokens, revokeWidgetToken } from "@/lib/widget/tokens";

export async function getLlmSettingsData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view settings." as const };
  }

  const [initialSettings, ai] = await Promise.all([
    getUserSettings(auth.supabase, auth.user.id),
    getAiAccessView(auth.supabase, auth.user.id),
  ]);
  return { initialSettings, ai };
}

export async function getTelegramSettingsData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view settings." as const };
  }

  const telegramStatus = await getTelegramLinkStatus(auth.supabase, auth.user.id);
  return { telegramStatus };
}

export async function getWidgetSettingsData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view settings." as const };
  }

  const widgetTokens = await listWidgetTokens(auth.supabase, auth.user.id);
  return { widgetTokens };
}

export async function generateWidgetTokenAction(): Promise<{
  error?: string;
  token?: string;
  id?: string;
}> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    const admin = createAdminClient();
    const result = await createWidgetToken(admin, auth.user.id);
    revalidatePath("/app/settings");
    return result;
  } catch (err) {
    console.error("Settings action failed:", err);
    return { error: "Couldn't generate a token. Try again." };
  }
}

export async function revokeWidgetTokenAction(tokenId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    const admin = createAdminClient();
    await revokeWidgetToken(admin, auth.user.id, tokenId);
    revalidatePath("/app/settings");
    return {};
  } catch (err) {
    console.error("Settings action failed:", err);
    return { error: "Couldn't revoke that token. Try again." };
  }
}

export async function generateTelegramLinkAction(): Promise<{
  error?: string;
  deepLink?: string;
}> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    const admin = createAdminClient();
    const status = await getTelegramLinkStatus(admin, auth.user.id);

    if (status.connected) {
      return {
        error: "Telegram is already connected. Disconnect first to link a different account.",
      };
    }

    const result = await createOrRefreshTelegramLink(admin, auth.user.id);
    revalidatePath("/app/settings");
    return { deepLink: result.deepLink };
  } catch (err) {
    console.error("Settings action failed:", err);
    return { error: "Couldn't generate a Telegram link. Try again." };
  }
}

export async function disconnectTelegramAction(): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    const admin = createAdminClient();
    await disconnectTelegram(admin, auth.user.id);
    revalidatePath("/app/settings");
    return {};
  } catch (err) {
    console.error("Settings action failed:", err);
    return { error: "Couldn't disconnect Telegram. Try again." };
  }
}

export async function updateTelegramCadenceAction(
  cadence: TelegramCadence,
): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await updateTelegramCadence(auth.supabase, cadence);
    revalidatePath("/app/settings");
    return {};
  } catch (err) {
    console.error("Settings action failed:", err);
    return { error: "Couldn't update reminder cadence. Try again." };
  }
}

export async function saveLlmSettingsAction(input: {
  provider: LlmProvider;
  apiKey: string;
}): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  const apiKey = input.apiKey.trim();
  if (!apiKey) return { error: "API key is required." };

  try {
    await saveLlmSettings(auth.supabase, auth.user.id, { ...input, apiKey });
    revalidatePath("/app/settings");
    revalidatePath("/app/quiz");
    revalidatePath("/app/read/stories");
    revalidatePath("/", "layout");
    return {};
  } catch (err) {
    console.error("Settings action failed:", err);
    return { error: "Couldn't save your AI key. Try again." };
  }
}

export async function clearLlmSettingsAction(): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await clearLlmSettings(auth.supabase, auth.user.id);
    revalidatePath("/app/settings");
    revalidatePath("/app/quiz");
    revalidatePath("/app/read/stories");
    revalidatePath("/", "layout");
    return {};
  } catch (err) {
    console.error("Settings action failed:", err);
    return { error: "Couldn't remove your AI key. Try again." };
  }
}
