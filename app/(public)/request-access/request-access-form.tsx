"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BackLink, PUBLIC_HOME_BACK_LABEL, PUBLIC_HOME_PATH } from "@/components/jargon/back-link";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requestAccess } from "./actions";

type RequestAccessFormProps = {
  defaultEmail?: string;
  emailLocked?: boolean;
};

export default function RequestAccessForm({
  defaultEmail = "",
  emailLocked = false,
}: RequestAccessFormProps) {
  const [state, action, pending] = useActionState(requestAccess, null);

  if (state && "success" in state) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4">
        <BackLink
          href={PUBLIC_HOME_PATH}
          label={PUBLIC_HOME_BACK_LABEL}
          className="-ml-2 self-start"
        />
        <h1 className="text-2xl font-semibold tracking-tight">You&apos;re on the list</h1>
        <p className="text-sm text-base-content/60">
          I&apos;ll email you the moment there&apos;s room — keep an eye on your inbox.
        </p>
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
        Jargon Gym is invite-only right now. Leave your email and I&apos;ll send you a signup link
        when there&apos;s room.
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
              defaultValue={defaultEmail}
              readOnly={emailLocked}
              className={emailLocked ? "opacity-70" : undefined}
            />
            {emailLocked ? (
              <FieldDescription>Tied to the account you&apos;re signed in with.</FieldDescription>
            ) : null}
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
