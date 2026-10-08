"use client";

import { UserRound } from "lucide-react";
import { useActionState, useState } from "react";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { DeleteAccountPanel } from "@/components/settings/delete-account-panel";
import { SettingsPanel, SettingsRow, SettingsStack } from "@/components/settings/ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  changePasswordAction,
  type AccountSettings,
  type ChangePasswordState,
} from "@/app/(private)/app/settings/actions";
import { cn } from "@/lib/utils";

type PasswordFormProps = {
  hasPassword: boolean;
  action: (formData: FormData) => void;
  pending: boolean;
  state: ChangePasswordState;
};

function PasswordForm({ hasPassword, action, pending, state }: PasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  return (
    <form action={action} className="flex flex-col gap-4">
      {state && "error" in state ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup>
        {hasPassword ? (
          <Field>
            <FieldLabel htmlFor="account-current-password">Current password</FieldLabel>
            <Input
              id="account-current-password"
              type="password"
              name="currentPassword"
              required
              autoComplete="current-password"
            />
          </Field>
        ) : null}

        <Field>
          <FieldLabel htmlFor="account-new-password">New password</FieldLabel>
          <Input
            id="account-new-password"
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
          <FieldLabel htmlFor="account-confirm-password">Confirm new password</FieldLabel>
          <Input
            id="account-confirm-password"
            type="password"
            name="confirmPassword"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {confirmPassword.length > 0 ? (
            <p
              className={cn(
                "text-xs",
                passwordsMatch ? "text-success-text" : "text-base-content/70",
              )}
            >
              {passwordsMatch ? "Passwords match" : "Passwords don't match"}
            </p>
          ) : null}
        </Field>
      </FieldGroup>

      <Button type="submit" isDisabled={pending} className="self-start">
        {pending ? "Saving…" : hasPassword ? "Change password" : "Set password"}
      </Button>
    </form>
  );
}

export function AccountPanel({ email, hasPassword }: AccountSettings) {
  const [state, action, pending] = useActionState(changePasswordAction, null);
  const saved = state && "success" in state ? state : null;

  return (
    <SettingsPanel
      id="account"
      icon={UserRound}
      title="Account"
      description="Manage how you log in, or delete your account."
    >
      <SettingsStack>
        <SettingsRow title="Email">
          <p className="m-0 text-sm break-all">{email ?? "No email on this account"}</p>
        </SettingsRow>
        <SettingsRow
          title="Password"
          description={
            hasPassword
              ? "Changing it signs you out on your other devices."
              : "You log in with Google. Set a password to also log in with your email."
          }
        >
          {saved ? (
            <Alert variant="success">
              <AlertDescription>
                {hasPassword ? "Password changed." : "Password set."} You're signed out on your
                other devices.
              </AlertDescription>
            </Alert>
          ) : null}
          <PasswordForm
            key={saved?.id ?? "form"}
            hasPassword={hasPassword || saved !== null}
            action={action}
            pending={pending}
            state={state}
          />
        </SettingsRow>
      </SettingsStack>
      {email ? <DeleteAccountPanel email={email} /> : null}
    </SettingsPanel>
  );
}
