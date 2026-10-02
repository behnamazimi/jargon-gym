"use client";

import type { SortMode } from "@/lib/jargon/types";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

type ToolbarProps = {
  hideKnown: boolean;
  onHideKnownChange: (value: boolean) => void;
  sortMode: SortMode;
  onSortChange: (value: SortMode) => void;
  visibleCount: number;
};

export function Toolbar({
  hideKnown,
  onHideKnownChange,
  sortMode,
  onSortChange,
  visibleCount,
}: ToolbarProps) {
  return (
    <div className="space-y-3">
      <Separator />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-h-8 cursor-pointer items-center gap-2 text-xs text-base-content/70">
            <Switch
              checked={hideKnown}
              onCheckedChange={onHideKnownChange}
              className="toggle-primary toggle-xs"
            />
            Hide terms I know
          </label>
          <Select
            value={sortMode}
            onChange={(value) => onSortChange(value as SortMode)}
            aria-label="Sort terms"
          >
            <SelectTrigger size="sm" className="rounded-field text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="w-auto **:data-[slot=select-item]:pe-8">
              <SelectItem id="default">Sort: default</SelectItem>
              <SelectItem id="category">Sort: category order</SelectItem>
              <SelectItem id="az">Sort: A–Z</SelectItem>
              <SelectItem id="unknown">Sort: unknown first</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm tabular-nums text-base-content/70">{visibleCount} shown</span>
      </div>
      <p className="text-xs text-base-content/70">
        <span className="md:hidden coarse:inline">
          Tap a term to expand · swipe it right to mark it known
        </span>
        <span className="hidden md:inline coarse:hidden">
          Click a term to expand · ✓ on a row marks it known
        </span>
      </p>
    </div>
  );
}
