"use server";

import { revalidatePath } from "next/cache";
import { logout } from "@/app/(private)/auth/actions";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAiAccessView } from "@/lib/llm/access";
import {
  createOrRefreshTelegramLink,
  disconnectTelegram,
  getTelegramLinkStatus,
  updateTelegramCadence,
} from "@/lib/telegram/links";
import type { TelegramCadence } from "@/lib/telegram/types";
import { createWidgetToken, listWidgetTokens, revokeWidgetToken } from "@/lib/widget/tokens";
import { deleteUserScreenshots } from "@/lib/issues/storage";

export async function getLlmSettingsData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view settings." as const };
  }

  return { ai: await getAiAccessView(auth.supabase) };
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

export async function deleteOwnAccountAction(confirmEmail: string): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  const { error } = await auth.supabase.rpc("delete_own_account", {
    p_confirm_email: confirmEmail,
  });
  if (error) {
    // AD001 marks messages the database wrote for the person to read.
    if (error.code === "AD001") return { error: error.message };
    console.error("Settings action failed:", error);
    return { error: "Couldn't delete your account. Try again, or contact support." };
  }

  await deleteUserScreenshots(auth.user.id).catch((err) =>
    console.error("Couldn't remove issue screenshots for a deleted account:", err),
  );
  await logout();
  return {};
}
