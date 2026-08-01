"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { StatusPage } from "@/components/status-page";
import { Button, LinkButton } from "@/components/ui/button";

type ErrorProps = {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
};

export default function Error({ error, reset, unstable_retry }: ErrorProps) {
  const retry = unstable_retry ?? reset;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      icon={AlertTriangle}
      title="Something went wrong"
      description="An unexpected error occurred. Try again, or return home if the problem continues."
    >
      <div className="flex flex-wrap items-center justify-center gap-3">
        {retry ? (
          <Button onPress={retry} className="transition-transform active:scale-[0.96]">
            Try again
          </Button>
        ) : null}
        <LinkButton href="/" variant="outline" className="transition-transform active:scale-[0.96]">
          Back to home
        </LinkButton>
      </div>
    </StatusPage>
  );
}
