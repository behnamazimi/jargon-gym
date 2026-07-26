"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BackLink, PUBLIC_HOME_BACK_LABEL, PUBLIC_HOME_PATH } from "@/components/jargon/back-link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  const success = state !== null && "success" in state;

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <BackLink
        href={PUBLIC_HOME_PATH}
        label={PUBLIC_HOME_BACK_LABEL}
        className="-ml-2 self-start"
      />
      <h1 className="text-2xl font-semibold tracking-tight">Forgot password</h1>

      {state && "error" in state ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {success ? (
        <Alert>
          <AlertDescription>
            If an account exists for that email, we&apos;ve sent a link to reset your password.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="forgot-password-email">Email</FieldLabel>
              <Input
                id="forgot-password-email"
                type="email"
                name="email"
                required
                autoComplete="email"
              />
            </Field>
          </FieldGroup>

          <Button type="submit" isDisabled={pending} className="mt-2">
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Remembered your password?{" "}
        <Link href="/login" className="underline underline-offset-2">
          Log in
        </Link>
      </p>
    </form>
  );
}
