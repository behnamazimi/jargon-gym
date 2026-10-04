"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/site";
import { useActionState, useEffect, useRef, useState } from "react";
import { AuthFormError } from "@/components/auth/auth-form-error";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { BackLink, PUBLIC_HOME_BACK_LABEL, PUBLIC_HOME_PATH } from "@/components/shared/back-link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { normalizeReferralCode } from "@/lib/auth/referral-code";
import { appendNextParam, safeNextPath } from "@/lib/auth/safe-next-path";
import { signup } from "./actions";

type SignupFormProps = {
  defaultReferenceCode?: string;
  defaultEmail?: string;
  next?: string;
};

export default function SignupForm({
  defaultReferenceCode = "",
  defaultEmail = "",
  next: rawNext,
}: SignupFormProps) {
  const next = safeNextPath(rawNext ?? null);
  const [state, action, pending] = useActionState(signup, null);
  const [email, setEmail] = useState(defaultEmail);
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

  if (state?.checkEmail) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-2xl font-medium">Check your email</h1>
        <Alert variant="success" icon={<Mail strokeWidth={1.5} />}>
          <AlertDescription>
            We sent a confirmation link to <strong>{state.checkEmail}</strong>. Open it to finish
            signing up, then log in. If you don&apos;t see it, check your spam folder.
          </AlertDescription>
        </Alert>
        <Link
          href={appendNextParam("/login", rawNext)}
          className="text-sm underline underline-offset-2"
        >
          Go to log in
        </Link>
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
      <h1 className="text-2xl font-medium">Sign up</h1>

      <GoogleSignInButton next={next} referenceCode={referenceCode} email={email} />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-base-content/10" />
        <span className="text-xs text-base-content/70">or sign up with email</span>
        <div className="h-px flex-1 bg-base-content/10" />
      </div>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <AuthFormError error={state?.error} context="signup" />

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="signup-email">Email</FieldLabel>
            <Input
              id="signup-email"
              type="email"
              name="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="signup-password">Password</FieldLabel>
            <Input
              id="signup-password"
              type="password"
              name="password"
              required
              autoComplete="new-password"
              value={password}
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
        <p className="m-0 text-center text-xs text-base-content/70">
          By signing up you agree to the{" "}
          <Link href={TERMS_PATH} className="underline underline-offset-2">
            Terms
          </Link>{" "}
          and{" "}
          <Link href={PRIVACY_PATH} className="underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="text-center text-sm text-base-content/70">
        Already have an account?{" "}
        <Link href={appendNextParam("/login", rawNext)} className="underline underline-offset-2">
          Log in
        </Link>
      </p>

      <p className="text-center text-sm text-base-content/70">
        Don&apos;t have a code?{" "}
        <Link href="/request-access" className="underline underline-offset-2">
          Request access
        </Link>
      </p>
    </div>
  );
}
