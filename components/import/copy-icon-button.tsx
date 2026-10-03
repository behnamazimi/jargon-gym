"use client";

import { useState } from "react";
import { CopyIconSwap } from "@/components/settings/ui";
import { Button } from "@/components/ui/button";

export function CopyIconButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={copied ? "Copied" : label}
      onPress={handleCopy}
      className="min-h-11 min-w-11 bg-base-100/80 backdrop-blur-sm md:min-h-8 md:min-w-8"
    >
      <CopyIconSwap copied={copied} />
    </Button>
  );
}
