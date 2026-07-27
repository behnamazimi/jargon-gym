import { getPasswordValidationError } from "@/lib/auth/password-policy";

export type AuthErrorContext = "login" | "signup" | "reset" | "forgot";

type AuthLikeError = {
  message?: string;
  msg?: string;
  code?: string;
  name?: string;
  status?: number;
  reasons?: string[];
  weak_password?: { reasons?: string[] };
};

const GENERIC_ERROR = "We couldn't complete that. Try again in a moment.";
const INVALID_LOGIN = "That email or password doesn't look right.";
const INVALID_REFERRAL = "That reference code isn't valid or was already used.";
const RESET_FAILED = "Couldn't reset your password. Request a new reset link and try again.";
const PASSWORD_FAILED =
  getPasswordValidationError("") ?? "Your password doesn't meet the requirements below.";

function isGarbageMessage(message: string): boolean {
  const trimmed = message.trim();
  return trimmed === "" || trimmed === "{}" || trimmed === "[object Object]";
}

function readMessage(error: AuthLikeError): string {
  for (const candidate of [error.message, error.msg]) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (!isGarbageMessage(trimmed)) {
        return trimmed;
      }
    }
  }
  return "";
}

function unwrapError(error: unknown): unknown {
  if (!error || typeof error !== "object") {
    return error;
  }

  if ("error" in error) {
    const nested = (error as { error?: unknown }).error;
    if (nested !== undefined) {
      return nested;
    }
  }

  return error;
}

function parseAuthError(error: unknown): AuthLikeError | string | null {
  const unwrapped = unwrapError(error);
  if (unwrapped == null) {
    return null;
  }

  if (typeof unwrapped === "string") {
    const trimmed = unwrapped.trim();
    return isGarbageMessage(trimmed) ? null : trimmed;
  }

  if (typeof unwrapped !== "object" || Array.isArray(unwrapped)) {
    return null;
  }

  if (Object.keys(unwrapped).length === 0) {
    return null;
  }

  return unwrapped as AuthLikeError;
}

function fallbackForContext(context?: AuthErrorContext): string {
  switch (context) {
    case "signup":
      return INVALID_REFERRAL;
    case "reset":
      return RESET_FAILED;
    default:
      return GENERIC_ERROR;
  }
}

function isLoginFailure(error: AuthLikeError, message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials") ||
    error.code === "invalid_credentials"
  );
}

function isReferralFailure(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("referral") ||
    lower.includes("database error saving new user") ||
    lower.includes("invalid or already used")
  );
}

function isPasswordFailure(error: AuthLikeError, message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("password") ||
    error.code === "weak_password" ||
    error.name === "AuthWeakPasswordError" ||
    (error.reasons?.length ?? 0) > 0 ||
    (error.weak_password?.reasons?.length ?? 0) > 0
  );
}

export function formatAuthError(error: unknown, context?: AuthErrorContext): string {
  const parsed = parseAuthError(error);
  if (parsed == null) {
    return context ? fallbackForContext(context) : "";
  }

  if (typeof parsed === "string") {
    return parsed;
  }

  const message = readMessage(parsed);

  if (message && isLoginFailure(parsed, message)) {
    return INVALID_LOGIN;
  }

  if (message && isReferralFailure(message)) {
    return INVALID_REFERRAL;
  }

  if (
    isPasswordFailure(parsed, message) ||
    (!message && (parsed.reasons?.length || parsed.weak_password?.reasons?.length))
  ) {
    return PASSWORD_FAILED;
  }

  if (message) {
    return message;
  }

  if (parsed.code === "invalid_credentials") {
    return INVALID_LOGIN;
  }

  return fallbackForContext(context);
}

export function formatLoginError(error: unknown): string {
  return formatAuthError(error, "login");
}

export function formatSignupError(error: unknown): string {
  return formatAuthError(error, "signup");
}

export function readFormError(error: unknown, context?: AuthErrorContext): string | null {
  if (error == null || error === "") {
    return null;
  }

  if (typeof error === "string") {
    const trimmed = error.trim();
    if (isGarbageMessage(trimmed)) {
      return null;
    }
    if (context === "signup" && trimmed === GENERIC_ERROR) {
      return INVALID_REFERRAL;
    }
    return trimmed;
  }

  const message = formatAuthError(error, context).trim();
  return message || null;
}
