"use server";

import { revalidatePath } from "next/cache";
import { logout } from "@/app/(private)/auth/actions";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import { getPasswordValidationError } from "@/lib/auth/password-policy";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import { getCreditCosts, getMyCreditSchedule } from "@/lib/ai-credits/repository";
import type { CreditCosts, CreditSchedule } from "@/lib/ai-credits/types";
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

export type AccountSettings = { email: string | null; hasPassword: boolean };

/** Accounts made with Google have no password until they set one. */
async function readAccountSettings(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<AccountSettings> {
  const { data } = await supabase.auth.getUser();
  return {
    email: data.user?.email ?? null,
    hasPassword: data.user?.identities?.some((identity) => identity.provider === "email") ?? false,
  };
}

export async function getAccountSettingsData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view settings." as const };
  }

  return { account: await readAccountSettings(auth.supabase) };
}

export type ChangePasswordState = { error: string } | { success: true; id: string } | null;

const WRONG_CURRENT_PASSWORD = "That isn't your current password.";
const SAME_PASSWORD = "Choose a password different from your current one.";

function validateNewPassword(password: string, confirmPassword: string): string | null {
  if (!password || !confirmPassword) return "Enter a new password in both fields.";
  const passwordError = getPasswordValidationError(password);
  if (passwordError) return passwordError;
  if (password !== confirmPassword) return "Passwords don't match.";
  return null;
}

type Client = Awaited<ReturnType<typeof createClient>>;

/** Returns the message to show, or null when the current password is right. */
async function checkCurrentPassword(
  supabase: Client,
  email: string | null,
  currentPassword: string,
  newPassword: string,
): Promise<string | null> {
  if (!email || !currentPassword) return "Enter your current password.";
  if (currentPassword === newPassword) return SAME_PASSWORD;

  const { error } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (!error) return null;
  return error.code === "invalid_credentials"
    ? WRONG_CURRENT_PASSWORD
    : formatAuthError(error, "login");
}

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: "Log in to continue." };

  const password = formData.get("password")?.toString() ?? "";
  const invalid = validateNewPassword(password, formData.get("confirmPassword")?.toString() ?? "");
  if (invalid) return { error: invalid };

  const { supabase } = auth;
  const { email, hasPassword } = await readAccountSettings(supabase);

  if (hasPassword) {
    const currentPassword = formData.get("currentPassword")?.toString() ?? "";
    const rejected = await checkCurrentPassword(supabase, email, currentPassword, password);
    if (rejected) return { error: rejected };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return {
      error:
        updateError.code === "same_password"
          ? SAME_PASSWORD
          : formatAuthError(updateError, "reset"),
    };
  }

  await supabase.auth.signOut({ scope: "others" });
  return { success: true, id: crypto.randomUUID() };
}

export async function getLlmSettingsData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view settings." as const };
  }

  const ai = await getAiAccessView(auth.supabase);
  const { costs, schedule } = await getCreditExplainerData(auth.supabase, ai);
  return { ai, costs, schedule };
}

/** What the credits explainer needs. Credits off, or any failure, just hide it. */
async function getCreditExplainerData(
  supabase: Client,
  ai: Awaited<ReturnType<typeof getAiAccessView>>,
): Promise<{ costs: CreditCosts | null; schedule: CreditSchedule | null }> {
  const hasCredits = ai.kind === "credits" || ai.reason === "exhausted";
  if (!hasCredits) return { costs: null, schedule: null };

  try {
    const [costs, schedule] = await Promise.all([
      ai.kind === "credits" ? ai.costs : getCreditCosts(supabase),
      getMyCreditSchedule(supabase),
    ]);
    return { costs, schedule };
  } catch (err) {
    console.error("Couldn't load the credits explainer:", err);
    return { costs: null, schedule: null };
  }
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
