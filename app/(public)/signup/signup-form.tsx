"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BackLink, PUBLIC_HOME_BACK_LABEL, PUBLIC_HOME_PATH } from "@/components/jargon/back-link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signup } from "./actions";

export default function SignupForm() {
  const [state, action, pending] = useActionState(signup, null);

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <BackLink
        href={PUBLIC_HOME_PATH}
        label={PUBLIC_HOME_BACK_LABEL}
        className="-ml-2 self-start"
      />
      <h1 className="text-2xl font-semibold tracking-tight">Sign up</h1>

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="signup-email">Email</FieldLabel>
          <Input id="signup-email" type="email" name="email" required autoComplete="email" />
        </Field>

        <Field>
          <FieldLabel htmlFor="signup-password">Password</FieldLabel>
          <Input
            id="signup-password"
            type="password"
            name="password"
            required
            autoComplete="new-password"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="signup-reference-code">Reference code</FieldLabel>
          <Input
            id="signup-reference-code"
            type="text"
            name="referenceCode"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="uppercase"
          />
        </Field>
      </FieldGroup>

      <Button type="submit" isDisabled={pending} className="mt-2">
        {pending ? "Creating account…" : "Sign up"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="underline underline-offset-2">
          Log in
        </Link>
      </p>
    </form>
  );
}
