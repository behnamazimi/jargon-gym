"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AuthFormError } from "@/components/auth/auth-form-error";
import { BackLink, PUBLIC_HOME_BACK_LABEL, PUBLIC_HOME_PATH } from "@/components/jargon/back-link";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { resetPassword } from "./actions";

export default function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPassword, null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state?.error) {
      setPassword("");
      setConfirmPassword("");
      setPasswordTouched(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  const passwordsMatch = password.length > 0 && password === confirmPassword;

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <BackLink
        href={PUBLIC_HOME_PATH}
        label={PUBLIC_HOME_BACK_LABEL}
        className="-ml-2 self-start"
      />
      <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>

      <AuthFormError error={state?.error} />

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="reset-password-password">New password</FieldLabel>
          <Input
            id="reset-password-password"
            type="password"
            name="password"
            required
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
            onBlur={() => setPasswordTouched(true)}
          />
          <PasswordRequirements
            password={password}
            visible={passwordTouched || password.length > 0}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="reset-password-confirm">Confirm new password</FieldLabel>
          <Input
            id="reset-password-confirm"
            type="password"
            name="confirmPassword"
            required
            autoComplete="new-password"
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {confirmPassword.length > 0 ? (
            <p className={cn("text-xs", passwordsMatch ? "text-success" : "text-base-content/60")}>
              {passwordsMatch ? "Passwords match" : "Passwords don't match"}
            </p>
          ) : null}
        </Field>
      </FieldGroup>

      <Button type="submit" isDisabled={pending} className="mt-2">
        {pending ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}
