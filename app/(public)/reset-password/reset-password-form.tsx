"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { resetPassword } from "./actions";

export default function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPassword, null);

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="reset-password-password">New password</FieldLabel>
          <Input
            id="reset-password-password"
            type="password"
            name="password"
            required
            autoComplete="new-password"
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
          />
        </Field>
      </FieldGroup>

      <Button type="submit" isDisabled={pending} className="mt-2">
        {pending ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}
