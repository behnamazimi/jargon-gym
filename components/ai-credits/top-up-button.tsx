"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { topUpAiCreditsAction } from "@/app/(private)/app/actions-ai-credits";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { TOPUP_COPY } from "@/lib/ai-credits/topup-copy";

export function TopUpButton({
  size,
  variant = "default",
  className,
}: {
  size?: ButtonSize;
  variant?: ButtonVariant;
  className?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function topUp() {
    startTransition(async () => {
      const result = await topUpAiCreditsAction();
      if (!result.ok) {
        const message = {
          unavailable: TOPUP_COPY.unavailable,
          "not-needed": TOPUP_COPY.notNeeded,
          failed: TOPUP_COPY.failed,
        }[result.reason];
        toast(message, "destructive");
        return;
      }
      toast(TOPUP_COPY.added(result.added), "success");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      onPress={topUp}
      isDisabled={isPending}
    >
      {isPending ? TOPUP_COPY.working : TOPUP_COPY.button}
    </Button>
  );
}
