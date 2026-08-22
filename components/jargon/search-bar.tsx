"use client";

import { X } from "lucide-react";
import { type RefObject } from "react";
import { useMediaQuery } from "@/hooks/use-platform";
import { PLATFORM_MEDIA } from "@/lib/platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
};

export function SearchBar({ value, onChange, onClear, inputRef }: SearchBarProps) {
  const isTouch = useMediaQuery(PLATFORM_MEDIA.coarsePointer);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          isTouch
            ? "Search terms or definitions…"
            : "Search terms or definitions…  (press / to focus)"
        }
        className="rounded-lg px-3.5 py-2.5 pr-10 text-sm"
      />
      {value ? (
        <TooltipTrigger>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1.5 -translate-y-1/2 text-base-content/60 hover:text-base-content"
            onPress={onClear}
            aria-label="Clear search"
          >
            <X className="size-3.5" aria-hidden strokeWidth={1.5} />
          </Button>
          <Tooltip>Clear search</Tooltip>
        </TooltipTrigger>
      ) : null}
    </div>
  );
}
