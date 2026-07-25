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
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <Field orientation="horizontal" className="w-auto items-center gap-1.5">
            <Checkbox id="hide-known" isSelected={hideKnown} onChange={onHideKnownChange} />
            <FieldLabel htmlFor="hide-known" className="text-xs font-normal text-muted-foreground">
              Hide terms I know
            </FieldLabel>
          </Field>
          <Select
            selectedKey={sortMode}
            onSelectionChange={(key) => onSortChange(key as SortMode)}
            aria-label="Sort terms"
          >
            <SelectTrigger size="sm" className="text-xs text-muted-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem id="default">Sort: category order</SelectItem>
              <SelectItem id="az">Sort: A–Z</SelectItem>
              <SelectItem id="unknown">Sort: unknown first</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground">{visibleCount} shown</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Tap a term to expand it · the ✓ circle marks it as known
      </p>
    </div>
  );
}
