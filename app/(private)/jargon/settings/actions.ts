"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clearLlmSettings, saveLlmSettings, updateQuizPreferences } from "@/lib/llm/settings";
import type { LlmProvider } from "@/lib/llm/types";
import {
  createOrRefreshTelegramLink,
  disconnectTelegram,
  getTelegramLinkStatus,
  updateTelegramCadence,
} from "@/lib/telegram/links";
import type { TelegramCadence } from "@/lib/telegram/types";
import { createWidgetToken, revokeWidgetToken } from "@/lib/widget/tokens";

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Log in to continue." as const };
  }

  return { supabase, user };
}

export async function generateWidgetTokenAction(): Promise<{
  error?: string;
  token?: string;
  id?: string;
}> {
  const auth = await getAuthenticatedUser();
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
  const auth = await getAuthenticatedUser();
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
  const auth = await getAuthenticatedUser();
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
  const auth = await getAuthenticatedUser();
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
  const auth = await getAuthenticatedUser();
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

export async function saveLlmSettingsAction(input: {
  provider: LlmProvider;
  apiKey: string;
}): Promise<{ error?: string }> {
  const auth = await getAuthenticatedUser();
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
  const auth = await getAuthenticatedUser();
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

export async function updateQuizPreferencesAction(input: {
  markUnknownOnFail: boolean;
  markKnownOnPass: boolean;
}): Promise<{ error?: string }> {
  const auth = await getAuthenticatedUser();
  if ("error" in auth) return { error: auth.error };

  try {
    await updateQuizPreferences(auth.supabase, auth.user.id, input);
    revalidatePath("/jargon/settings");
    return {};
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Couldn't save quiz preferences. Try again.";
    return { error: message };
  }
}

export async function updateReviewPresetAction(
  preset: "balanced" | "learn_new" | "drill_weak",
): Promise<{ error?: string }> {
  const auth = await getAuthenticatedUser();
  if ("error" in auth) return { error: auth.error };

  try {
    const { updateReviewPreset } = await import("@/lib/llm/settings");
    await updateReviewPreset(auth.supabase, auth.user.id, preset);
    revalidatePath("/jargon/settings");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't update review preset.";
    return { error: message };
  }
}
