"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DOMAIN_LANGUAGE_OPTIONS,
  parseLanguage,
  type DomainLanguage,
} from "@/lib/jargon/languages";

type LanguageToggleProps = {
  value: DomainLanguage;
  onChange: (language: DomainLanguage) => void;
  isDisabled?: boolean;
};

export function LanguageToggle({ value, onChange, isDisabled }: LanguageToggleProps) {
  return (
    <ToggleGroup
      aria-label="Language"
      selectionMode="single"
      disallowEmptySelection
      variant="outline"
      isDisabled={isDisabled}
      selectedKeys={[value]}
      onSelectionChange={(keys) => {
        const [key] = [...keys];
        if (key !== undefined) onChange(parseLanguage(String(key)));
      }}
    >
      {DOMAIN_LANGUAGE_OPTIONS.map((option) => (
        <ToggleGroupItem key={option.value} id={option.value} className="min-h-11 min-w-24">
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
