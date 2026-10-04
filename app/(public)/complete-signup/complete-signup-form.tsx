"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { AuthFormError } from "@/components/auth/auth-form-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { redeemReferralCode } from "./actions";

type CompleteSignupFormProps = {
  codeRanOut?: boolean;
  defaultReferenceCode?: string;
  initialError?: string | null;
  next?: string;
};

export default function CompleteSignupForm({
  codeRanOut = false,
  defaultReferenceCode = "",
  initialError = null,
  next: rawNext,
}: CompleteSignupFormProps) {
  const next = safeNextPath(rawNext ?? null);
  const [state, action, pending] = useActionState(redeemReferralCode, null);
  const error = state?.error ?? initialError;

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <h1 className="text-2xl font-medium">Complete sign up</h1>
      <p className="text-sm text-base-content/70">
        Almost there. Enter your reference code to finish setting up your account.
      </p>

      {codeRanOut && (
        <Alert variant="warning">
          <AlertDescription>
            The code you signed up with ran out of seats before your email was confirmed. Enter
            another code, or{" "}
            <Link href="/request-access" className="underline underline-offset-2">
              request access
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      {!defaultReferenceCode && !codeRanOut && (
        <Alert variant="info" icon={<Mail strokeWidth={1.5} />}>
          <AlertDescription>
            No code yet? You get one once your access is approved.{" "}
            <Link href="/request-access" className="underline underline-offset-2">
              Request access
            </Link>{" "}
            to start.
          </AlertDescription>
        </Alert>
      )}

      <AuthFormError error={error} context="signup" />

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="complete-signup-reference-code">Reference code</FieldLabel>
          <Input
            id="complete-signup-reference-code"
            type="text"
            name="referenceCode"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            defaultValue={defaultReferenceCode}
            className="uppercase"
          />
          <FieldDescription>Enter the code you were given.</FieldDescription>
        </Field>
      </FieldGroup>

      <Button type="submit" isDisabled={pending} className="mt-2">
        {pending ? "Verifying…" : "Continue"}
      </Button>
    </form>
  );
}
