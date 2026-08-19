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
  defaultReferenceCode?: string;
  initialError?: string | null;
  next?: string;
};

export default function CompleteSignupForm({
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
      <h1 className="text-2xl font-semibold tracking-tight">Complete sign up</h1>
      <p className="text-sm text-base-content/60">
        Almost there — enter your reference code to finish setting up your account.
      </p>

      <Alert className="alert alert-soft">
        <Mail aria-hidden className="size-10 shrink-0" />
        <AlertDescription>
          You need a reference code to finish setting up your account. If you don&apos;t have one,{" "}
          <Link href="/request-access" className="underline underline-offset-2">
            request access
          </Link>
          .
        </AlertDescription>
      </Alert>

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
          <FieldDescription>
            You need a reference code from admin/owner of the app.
          </FieldDescription>
        </Field>
      </FieldGroup>

      <Button type="submit" isDisabled={pending} className="mt-2">
        {pending ? "Verifying…" : "Continue"}
      </Button>
    </form>
  );
}
