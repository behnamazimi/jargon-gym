"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BackLink, PUBLIC_HOME_BACK_LABEL, PUBLIC_HOME_PATH } from "@/components/jargon/back-link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { login } from "./actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <BackLink
        href={PUBLIC_HOME_PATH}
        label={PUBLIC_HOME_BACK_LABEL}
        className="-ml-2 self-start"
      />
      <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
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
              className="text-xs text-base-content/60 underline underline-offset-2"
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

      <Button type="submit" isDisabled={pending} className="mt-2">
        {pending ? "Logging in…" : "Log in"}
      </Button>

      <p className="text-center text-sm text-base-content/60">
        Need an account?{" "}
        <Link href="/signup" className="underline underline-offset-2">
          Sign up
        </Link>
      </p>
    </form>
  );
}
