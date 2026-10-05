"use client";

import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export function OptionRow({
  id,
  label,
  description,
  checked,
  disabledNote,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabledNote?: string;
  onChange: (checked: boolean) => void;
}) {
  const disabled = Boolean(disabledNote);
  return (
    <li
      className={cn(
        "flex min-h-14 items-center justify-between gap-4 px-4 py-3",
        disabled && "opacity-50",
      )}
    >
      <div className="min-w-0">
        <label
          htmlFor={id}
          className={cn(
            "block text-sm font-medium text-base-content",
            disabled ? "cursor-not-allowed" : "cursor-pointer",
          )}
        >
          {label}
        </label>
        <p id={`${id}-description`} className="m-0 text-xs text-base-content/70">
          {disabledNote ?? description}
        </p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        aria-describedby={`${id}-description`}
        onCheckedChange={onChange}
        className="toggle-primary shrink-0"
      />
    </li>
  );
}

/** A row with a label and one choice out of a few, like 1x, 1.5x, 2x. */
export function ChoiceRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <p className="m-0 text-sm font-medium text-base-content">{label}</p>
      <ToggleGroup
        aria-label={label}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[String(value)]}
        onSelectionChange={(keys) => {
          const [key] = [...keys];
          const picked = options.find((option) => String(option.value) === key);
          if (picked) onChange(picked.value);
        }}
      >
        {options.map((option) => (
          <ToggleGroupItem key={option.value} id={String(option.value)}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </li>
  );
}
