"use client";

import { useActionState } from "react";
import { AuthFormError } from "@/components/auth/auth-form-error";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { redeemReferralCode } from "./actions";

type CompleteSignupFormProps = {
  defaultReferenceCode?: string;
  initialError?: string | null;
};

export default function CompleteSignupForm({
  defaultReferenceCode = "",
  initialError = null,
}: CompleteSignupFormProps) {
  const [state, action, pending] = useActionState(redeemReferralCode, null);
  const error = state?.error ?? initialError;

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Complete sign up</h1>
      <p className="text-sm text-base-content/60">
        Enter your reference code to finish creating your account.
      </p>

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
        </Field>
      </FieldGroup>

      <Button type="submit" isDisabled={pending} className="mt-2">
        {pending ? "Verifying…" : "Continue"}
      </Button>
    </form>
  );
}
