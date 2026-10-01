"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";

type AdminErrorProps = {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
};

export default function AdminError({ reset, unstable_retry }: AdminErrorProps) {
  const retry = unstable_retry ?? reset;

  return (
    <div className="flex flex-col items-start gap-4">
      <Alert variant="destructive" className="w-full">
        <AlertDescription>Something went wrong loading this page.</AlertDescription>
      </Alert>
      {retry ? (
        <button type="button" className="btn" onClick={retry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
