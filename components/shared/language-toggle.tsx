"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DOMAIN_LANGUAGE_OPTIONS, parseLanguage, type DomainLanguage } from "@/lib/terms/languages";

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
      isDisabled={isDisabled}
      selectedKeys={[value]}
      onSelectionChange={(keys) => {
        const [key] = [...keys];
        if (key !== undefined) onChange(parseLanguage(String(key)));
      }}
    >
      {DOMAIN_LANGUAGE_OPTIONS.map((option) => (
        <ToggleGroupItem key={option.value} id={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
