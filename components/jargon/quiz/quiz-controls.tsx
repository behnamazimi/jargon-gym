"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function QuizSetupOption({
  name,
  value,
  checked,
  onChange,
  title,
  description,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="radio radio-primary radio-sm mt-0.5 shrink-0"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-none font-medium">{title}</span>
        <span className="mt-1.5 block text-xs leading-relaxed text-base-content/60">
          {description}
        </span>
      </span>
    </label>
  );
}

type QuizChoiceState = "default" | "selected" | "correct" | "incorrect";

const CHOICE_STATE_CLASS: Record<QuizChoiceState, string> = {
  default: "shadow-surface bg-base-100 ring-1 ring-base-content/5 hover:ring-base-content/10",
  selected: "bg-primary/5 ring-2 ring-primary/30",
  correct: "bg-success/10 ring-2 ring-success/30",
  incorrect: "bg-error/10 ring-2 ring-error/30",
};

export function QuizChoice({
  label,
  state,
  disabled,
  onSelect,
  marker,
}: {
  label: ReactNode;
  state: QuizChoiceState;
  disabled?: boolean;
  onSelect?: () => void;
  marker?: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm",
        CHOICE_STATE_CLASS[state],
        disabled && "cursor-default",
        !disabled && "cursor-pointer",
      )}
    >
      {marker ? <span className="mt-0.5 shrink-0">{marker}</span> : null}
      <span className="min-w-0 flex-1 leading-snug">{label}</span>
    </button>
  );
}
