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
  amount,
  onAdded,
}: {
  size?: ButtonSize;
  variant?: ButtonVariant;
  className?: string;
  /** The free credits on offer, so the label can say how many. */
  amount?: number;
  onAdded?: () => void;
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
          "already-today": TOPUP_COPY.alreadyToday,
          failed: TOPUP_COPY.failed,
        }[result.reason];
        toast(message, "destructive");
        router.refresh();
        return;
      }
      toast(TOPUP_COPY.added(result.added), "success");
      onAdded?.();
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
      {isPending ? TOPUP_COPY.working : amount ? TOPUP_COPY.buttonFor(amount) : TOPUP_COPY.button}
    </Button>
  );
}
