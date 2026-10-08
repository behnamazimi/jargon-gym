"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { AuthFormError } from "@/components/auth/auth-form-error";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { BackLink, PUBLIC_HOME_BACK_LABEL, PUBLIC_HOME_PATH } from "@/components/shared/back-link";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SUSPENDED_ERROR } from "@/lib/auth/format-auth-error";
import { appendNextParam, safeNextPath } from "@/lib/auth/safe-next-path";
import { login } from "./actions";

const OAUTH_FAILED_ERROR = "Google login didn't work. Try again or use your email instead.";

const LINK_FAILED_ERROR = "That link didn't work here. Log in with your email and password.";

const RESET_FAILED_ERROR =
  "That reset link expired or was opened in a different browser. Request a new one.";

const QUERY_ERRORS: Record<string, string> = {
  "oauth-failed": OAUTH_FAILED_ERROR,
  "link-failed": LINK_FAILED_ERROR,
  "reset-failed": RESET_FAILED_ERROR,
  suspended: SUSPENDED_ERROR,
};

export default function LoginForm() {
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const next = safeNextPath(rawNext);
  const queryError = QUERY_ERRORS[searchParams.get("error") ?? ""] ?? null;
  const [state, action, pending] = useActionState(login, null);
  const error = state?.error ?? queryError;
  const showResetLink = !state?.error && searchParams.get("error") === "reset-failed";

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <BackLink
        href={PUBLIC_HOME_PATH}
        label={PUBLIC_HOME_BACK_LABEL}
        className="-ml-2 self-start"
      />
      <h1 className="text-2xl font-medium">Log in</h1>

      <GoogleSignInButton next={next} />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-base-content/10" />
        <span className="text-xs text-base-content/70">or log in with email</span>
        <div className="h-px flex-1 bg-base-content/10" />
      </div>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <AuthFormError error={error} />
        {showResetLink ? (
          <Link href="/forgot-password" className="text-sm underline underline-offset-2">
            Request a new reset link
          </Link>
        ) : null}

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="login-email">Email</FieldLabel>
            <Input id="login-email" type="email" name="email" required autoComplete="email" />
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="login-password">Password</FieldLabel>
              <Link
                href="/forgot-password"
                className="text-xs text-base-content/70 underline underline-offset-2"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="login-password"
              type="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </Field>
        </FieldGroup>

        <Button type="submit" isDisabled={pending} className="mt-2 w-full">
          {pending ? "Logging in…" : "Log in with email"}
        </Button>
      </form>

      <p className="text-center text-sm text-base-content/70">
        Need an account?{" "}
        <Link href={appendNextParam("/signup", rawNext)} className="underline underline-offset-2">
          Sign up
        </Link>
      </p>
    </div>
  );
}
