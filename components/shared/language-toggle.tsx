"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COLLECTION_LANGUAGE_OPTIONS,
  parseLanguage,
  type CollectionLanguage,
} from "@/lib/terms/languages";

type LanguageToggleProps = {
  value: CollectionLanguage;
  onChange: (language: CollectionLanguage) => void;
  isDisabled?: boolean;
};

export function LanguageToggle({ value, onChange, isDisabled }: LanguageToggleProps) {
  return (
    <Select
      aria-label="Language"
      value={value}
      isDisabled={isDisabled}
      className="w-full"
      onChange={(key) => {
        if (key != null) onChange(parseLanguage(String(key)));
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {COLLECTION_LANGUAGE_OPTIONS.map((option) => (
          <SelectItem key={option.value} id={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
