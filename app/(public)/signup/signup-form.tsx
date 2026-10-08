"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { AuthFormError } from "@/components/auth/auth-form-error";
import { LegalConsentLine } from "@/components/auth/legal-consent-line";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { BackLink, PUBLIC_HOME_BACK_LABEL, PUBLIC_HOME_PATH } from "@/components/shared/back-link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { normalizeReferralCode } from "@/lib/auth/referral-code";
import { appendNextParam, safeNextPath } from "@/lib/auth/safe-next-path";
import { SUPPORT_EMAIL } from "@/lib/site";
import { resendConfirmation, signup } from "./actions";

const RESEND_COOLDOWN_MS = 60_000;

type CheckEmailProps = {
  email: string;
  rawNext?: string;
  onChangeEmail: () => void;
};

function CheckEmail({ email, rawNext, onChangeEmail }: CheckEmailProps) {
  const [isSending, startSending] = useTransition();
  const [resent, setResent] = useState(false);
  const [coolingDown, setCoolingDown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleResend() {
    startSending(async () => {
      const result = await resendConfirmation(email, rawNext);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setResent(true);
      setCoolingDown(true);
      setTimeout(() => setCoolingDown(false), RESEND_COOLDOWN_MS);
    });
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-medium">Check your email</h1>
      <Alert variant="success" icon={<Mail strokeWidth={1.5} />}>
        <AlertDescription>
          A confirmation link was sent to <strong>{email}</strong>. Open it to confirm your email.
          If it doesn&apos;t sign you in, come back and log in. If you don&apos;t see it, check your
          spam folder.
        </AlertDescription>
      </Alert>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {resent && !error ? (
        <p className="m-0 text-sm text-base-content/70" role="status">
          Sent again. Still nothing? Email {SUPPORT_EMAIL} and mention this address.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          isDisabled={isSending || coolingDown}
          onPress={handleResend}
        >
          {isSending ? "Sending…" : "Resend the email"}
        </Button>
        <Button type="button" variant="ghost" className="flex-1" onPress={onChangeEmail}>
          Use a different email
        </Button>
      </div>

      <p className="m-0 text-sm text-base-content/70">
        Already have an account?{" "}
        <Link href={appendNextParam("/login", rawNext)} className="underline underline-offset-2">
          Log in
        </Link>{" "}
        or{" "}
        <Link href="/forgot-password" className="underline underline-offset-2">
          reset your password
        </Link>
        .
      </p>
    </div>
  );
}

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
  const [dismissed, setDismissed] = useState<typeof state>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state?.error) {
      setPassword("");
      setPasswordTouched(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  if (state?.checkEmail && dismissed !== state) {
    return (
      <CheckEmail
        email={state.checkEmail}
        rawNext={rawNext}
        onChangeEmail={() => {
          setDismissed(state);
          setPassword("");
          setPasswordTouched(false);
        }}
      />
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
      <LegalConsentLine action="signing up" className="-mt-2" />

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
            <FieldLabel htmlFor="signup-reference-code">Invite code</FieldLabel>
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
            <FieldDescription>It's in your invite.</FieldDescription>
          </Field>
        </FieldGroup>

        <Button type="submit" isDisabled={pending} className="mt-2 w-full">
          {pending ? "Creating account…" : "Sign up with email"}
        </Button>
      </form>

      <p className="text-center text-sm text-base-content/70">
        Already have an account?{" "}
        <Link href={appendNextParam("/login", rawNext)} className="underline underline-offset-2">
          Log in
        </Link>
      </p>

      <p className="text-center text-sm text-base-content/70">
        Don&apos;t have an invite code?{" "}
        <Link href="/request-access" className="underline underline-offset-2">
          Request access
        </Link>
      </p>
    </div>
  );
}
