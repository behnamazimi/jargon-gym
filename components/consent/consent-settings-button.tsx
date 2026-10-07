"use client";

import { footerLinkClass } from "@/components/footer-link";
import { openConsentChoices } from "@/lib/consent/store";
import { cn } from "@/lib/utils";

export function ConsentSettingsButton({
  className,
  onOpen,
}: {
  className?: string;
  onOpen?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        openConsentChoices();
        onOpen?.();
      }}
      className={cn(footerLinkClass, className)}
    >
      Analytics choice
    </button>
  );
}
