"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { COLLECTION_KIND_OPTIONS, parseKind, type CollectionKind } from "@/lib/terms/kinds";

const KIND_HINTS: Record<CollectionKind, string> = {
  terms: "Terms from a field or a job, like finance or nursing.",
  vocabulary: "Words and phrases of a language you're learning.",
};

type KindToggleProps = {
  value: CollectionKind | null;
  onChange: (kind: CollectionKind) => void;
  isDisabled?: boolean;
};

/** Field terms or Words and phrases. Starts empty when nothing is picked yet. */
export function KindToggle({ value, onChange, isDisabled }: KindToggleProps) {
  return (
    <div className="space-y-1.5">
      <ToggleGroup
        aria-label="What it teaches"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={value ? [value] : []}
        isDisabled={isDisabled}
        onSelectionChange={(keys) => {
          const [key] = [...keys];
          if (key) onChange(parseKind(String(key)));
        }}
        className="flex-nowrap"
      >
        {COLLECTION_KIND_OPTIONS.map((option) => (
          <ToggleGroupItem key={option.value} id={option.value} className="flex-1 px-2">
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="m-0 text-xs text-base-content/70">
        {value ? KIND_HINTS[value] : "Pick the one that fits."}
      </p>
    </div>
  );
}
