"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LoveButtonProps = {
  loved: boolean;
  count: number;
  onToggle: () => void;
  isDisabled?: boolean;
};

export function LoveButton({ loved, count, onToggle, isDisabled }: LoveButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      onPress={onToggle}
      isDisabled={isDisabled}
      aria-pressed={loved}
      aria-label={loved ? "Loved" : "Love this collection"}
      className="min-h-11 gap-1.5 px-3 transition-transform active:scale-[0.96] md:min-h-8"
    >
      <Heart
        className={cn("size-4", loved && "fill-error text-error")}
        aria-hidden
        strokeWidth={1.5}
      />
      <span className="tabular-nums">{count}</span>
    </Button>
  );
}
