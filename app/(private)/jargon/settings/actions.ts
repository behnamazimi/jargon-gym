"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveReadMode } from "@/lib/jargon/read-settings";
import type { ReadMode } from "@/lib/jargon/read-settings";
import { clearLlmSettings, saveLlmSettings } from "@/lib/llm/settings";
import type { LlmProvider } from "@/lib/llm/types";
import {
  createOrRefreshTelegramLink,
  disconnectTelegram,
  getTelegramLinkStatus,
  updateTelegramCadence,
} from "@/lib/telegram/links";
import type { TelegramCadence } from "@/lib/telegram/types";
import { createWidgetToken, revokeWidgetToken } from "@/lib/widget/tokens";

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
    revalidatePath("/jargon/settings");
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't generate a token. Try again.";
    return { error: message };
  }
}

export async function revokeWidgetTokenAction(tokenId: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    const admin = createAdminClient();
    await revokeWidgetToken(admin, auth.user.id, tokenId);
    revalidatePath("/jargon/settings");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't revoke that token. Try again.";
    return { error: message };
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
    revalidatePath("/jargon/settings");
    return { deepLink: result.deepLink };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Couldn't generate a Telegram link. Try again.";
    return { error: message };
  }
}

export async function disconnectTelegramAction(): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    const admin = createAdminClient();
    await disconnectTelegram(admin, auth.user.id);
    revalidatePath("/jargon/settings");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't disconnect Telegram. Try again.";
    return { error: message };
  }
}

export async function updateTelegramCadenceAction(
  cadence: TelegramCadence,
): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await updateTelegramCadence(auth.supabase, cadence);
    revalidatePath("/jargon/settings");
    return {};
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Couldn't update reminder cadence. Try again.";
    return { error: message };
  }
}

export async function updateReadModeAction(readMode: ReadMode): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await saveReadMode(auth.supabase, auth.user.id, readMode);
    revalidatePath("/jargon/settings");
    revalidatePath("/jargon/read");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't update read mode. Try again.";
    return { error: message };
  }
}

export async function saveLlmSettingsAction(input: {
  provider: LlmProvider;
  apiKey: string;
}): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await saveLlmSettings(auth.supabase, auth.user.id, input);
    revalidatePath("/jargon/settings");
    revalidatePath("/jargon/quiz");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't save quiz settings. Try again.";
    return { error: message };
  }
}

export async function clearLlmSettingsAction(): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await clearLlmSettings(auth.supabase, auth.user.id);
    revalidatePath("/jargon/settings");
    revalidatePath("/jargon/quiz");
    return {};
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Couldn't remove quiz settings. Try again.";
    return { error: message };
  }
}
