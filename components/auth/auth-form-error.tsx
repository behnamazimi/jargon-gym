"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { readFormError, type AuthErrorContext } from "@/lib/auth/format-auth-error";

type AuthFormErrorProps = {
  error: unknown;
  context?: AuthErrorContext;
};

export function AuthFormError({ error, context }: AuthFormErrorProps) {
  const message = readFormError(error, context);

  if (!message) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
