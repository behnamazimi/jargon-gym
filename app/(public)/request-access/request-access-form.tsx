"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BackLink, PUBLIC_HOME_BACK_LABEL, PUBLIC_HOME_PATH } from "@/components/jargon/back-link";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requestAccess } from "./actions";

export default function RequestAccessForm() {
  const [state, action, pending] = useActionState(requestAccess, null);

  if (state && "success" in state) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4">
        <BackLink
          href={PUBLIC_HOME_PATH}
          label={PUBLIC_HOME_BACK_LABEL}
          className="-ml-2 self-start"
        />
        <h1 className="text-2xl font-semibold tracking-tight">Request access</h1>
        <Alert>
          <AlertDescription>
            If that&apos;s a new email, we&apos;ve added you to the list — we&apos;ll email you when
            you&apos;re approved.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <BackLink
        href={PUBLIC_HOME_PATH}
        label={PUBLIC_HOME_BACK_LABEL}
        className="-ml-2 self-start"
      />
      <h1 className="text-2xl font-semibold tracking-tight">Request access</h1>
      <p className="text-sm text-base-content/60">
        Jargon Gym is invite-only right now. Leave your email and we&apos;ll send you a signup link
        when you&apos;re approved.
      </p>

      <form action={action} className="flex flex-col gap-4">
        {state?.error ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="request-access-email">Email</FieldLabel>
            <Input
              id="request-access-email"
              type="email"
              name="email"
              required
              autoComplete="email"
            />
          </Field>

          <div className="hidden" aria-hidden="true">
            <label htmlFor="request-access-company">Company</label>
            <input
              id="request-access-company"
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
        </FieldGroup>

        <Button type="submit" isDisabled={pending} className="mt-2 w-full">
          {pending ? "Requesting…" : "Request access"}
        </Button>
      </form>
    </div>
  );
}
