"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { AuthFormError } from "@/components/auth/auth-form-error";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { BackLink, PUBLIC_HOME_BACK_LABEL, PUBLIC_HOME_PATH } from "@/components/jargon/back-link";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { normalizeReferralCode } from "@/lib/auth/referral-code";
import { appendNextParam, safeNextPath } from "@/lib/auth/safe-next-path";
import { signup } from "./actions";

type SignupFormProps = {
  defaultReferenceCode?: string;
  next?: string;
};

export default function SignupForm({ defaultReferenceCode = "", next: rawNext }: SignupFormProps) {
  const next = safeNextPath(rawNext ?? null);
  const [state, action, pending] = useActionState(signup, null);
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [referenceCode, setReferenceCode] = useState(defaultReferenceCode);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state?.error) {
      setPassword("");
      setPasswordTouched(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <BackLink
        href={PUBLIC_HOME_PATH}
        label={PUBLIC_HOME_BACK_LABEL}
        className="-ml-2 self-start"
      />
      <h1 className="text-2xl font-semibold tracking-tight">Sign up</h1>

      <GoogleSignInButton next={next} referenceCode={referenceCode} />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-base-content/10" />
        <span className="text-xs text-base-content/60">or sign up with email</span>
        <div className="h-px flex-1 bg-base-content/10" />
      </div>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <AuthFormError error={state?.error} context="signup" />

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
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => setPasswordTouched(true)}
            />
            <PasswordRequirements
              password={password}
              visible={passwordTouched || password.length > 0}
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
              value={referenceCode}
              onChange={(event) => setReferenceCode(normalizeReferralCode(event.target.value))}
              className="uppercase"
            />
            <FieldDescription>
              You need a reference code from admin/owner of the app.
            </FieldDescription>
          </Field>
        </FieldGroup>

        <Button type="submit" isDisabled={pending} className="mt-2 w-full">
          {pending ? "Creating account…" : "Sign up with email"}
        </Button>
      </form>

      <p className="text-center text-sm text-base-content/60">
        Already have an account?{" "}
        <Link href={appendNextParam("/login", rawNext)} className="underline underline-offset-2">
          Log in
        </Link>
      </p>

      <p className="text-center text-sm text-base-content/60">
        Don&apos;t have a code?{" "}
        <Link href="/request-access" className="underline underline-offset-2">
          Request access
        </Link>
      </p>
    </div>
  );
}
