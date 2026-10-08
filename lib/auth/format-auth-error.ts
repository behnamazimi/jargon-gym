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
const INVALID_LOGIN =
  "That email or password doesn't look right. Signed up with Google? Use Continue with Google.";
export const SUSPENDED_ERROR = "This account has been suspended.";
const INVALID_REFERRAL = "That invite code isn't valid, was already used, or has run out.";
export const FULL_REFERRAL = "That invite code is full or has expired.";
export const RATE_LIMITED_ERROR = "Too many attempts right now. Wait a few minutes and try again.";
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

function isFullReferral(message: string): boolean {
  return message.toLowerCase().includes("full or expired");
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

function hasPasswordReasons(error: AuthLikeError): boolean {
  return (error.reasons?.length ?? 0) > 0 || (error.weak_password?.reasons?.length ?? 0) > 0;
}

type FailureRule = {
  matches: (error: AuthLikeError, message: string) => boolean;
  result: string;
};

const RATE_LIMIT_CODES = ["over_email_send_rate_limit", "over_request_rate_limit"];

const FAILURE_RULES: FailureRule[] = [
  {
    matches: (error) => error.code === "user_banned",
    result: SUSPENDED_ERROR,
  },
  {
    matches: (error) => error.code !== undefined && RATE_LIMIT_CODES.includes(error.code),
    result: RATE_LIMITED_ERROR,
  },
  {
    matches: (error, message) => Boolean(message) && isLoginFailure(error, message),
    result: INVALID_LOGIN,
  },
  {
    matches: (_error, message) => Boolean(message) && isFullReferral(message),
    result: FULL_REFERRAL,
  },
  {
    matches: (error, message) => Boolean(message) && isReferralFailure(message),
    result: INVALID_REFERRAL,
  },
  {
    matches: (error, message) =>
      isPasswordFailure(error, message) || (!message && hasPasswordReasons(error)),
    result: PASSWORD_FAILED,
  },
];

export function formatAuthError(error: unknown, context?: AuthErrorContext): string {
  const parsed = parseAuthError(error);
  if (parsed == null) {
    return context ? fallbackForContext(context) : "";
  }

  if (typeof parsed === "string") {
    return parsed;
  }

  const message = readMessage(parsed);
  const rule = FAILURE_RULES.find(({ matches }) => matches(parsed, message));
  if (rule) {
    return rule.result;
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
