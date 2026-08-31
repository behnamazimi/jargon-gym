"use client";

import type { SortMode } from "@/lib/jargon/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
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
          <Field orientation="horizontal" className="w-auto items-center gap-1.5">
            <Checkbox
              id="hide-known"
              isSelected={hideKnown}
              onChange={onHideKnownChange}
              className="checkbox-xs"
            />
            <FieldLabel htmlFor="hide-known" className="text-xs font-normal text-base-content/60">
              Hide terms I know
            </FieldLabel>
          </Field>
          <Select
            value={sortMode}
            onChange={(value) => onSortChange(value as SortMode)}
            aria-label="Sort terms"
          >
            <SelectTrigger size="sm" className="rounded-lg text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem id="default">Sort: category order</SelectItem>
              <SelectItem id="az">Sort: A–Z</SelectItem>
              <SelectItem id="unknown">Sort: unknown first</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm tabular-nums text-base-content/60">{visibleCount} shown</span>
      </div>
      <p className="text-xs text-base-content/60">Tap a term to expand · ✓ marks it known</p>
    </div>
  );
}
