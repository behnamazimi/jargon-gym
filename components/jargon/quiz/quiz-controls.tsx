"use client";

import { Check, X } from "lucide-react";
import type { ReactNode } from "react";
import { RadioButton, RadioField, SelectionIndicator } from "react-aria-components";
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

/** Submitted-answer result, independent of the live selection ring Radio already draws. */
export type QuizChoiceResult = "default" | "correct" | "incorrect";

const RESULT_STATE_CLASS: Record<QuizChoiceResult, string> = {
  default: "",
  correct: "bg-success/10 ring-2 ring-success/30",
  incorrect: "bg-error/10 ring-2 ring-error/30",
};

const RESULT_STATUS_TEXT: Partial<Record<QuizChoiceResult, string>> = {
  correct: "Correct answer",
  incorrect: "Your answer, incorrect",
};

export function QuizChoice({
  value,
  label,
  result = "default",
}: {
  value: string;
  label: ReactNode;
  result?: QuizChoiceResult;
}) {
  const statusText = RESULT_STATUS_TEXT[result];

  return (
    <RadioField value={value} className="block">
      <RadioButton
        className={({ isSelected, isFocusVisible, isDisabled }) =>
          cn(
            "flex w-full items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm outline-none transition-colors duration-150",
            result !== "default"
              ? RESULT_STATE_CLASS[result]
              : isSelected
                ? "bg-primary/5 ring-2 ring-primary/30"
                : "shadow-surface bg-base-100 ring-1 ring-base-content/5 hover:ring-base-content/10",
            isFocusVisible && "ring-2 ring-primary ring-offset-2 ring-offset-base-100",
            isDisabled ? "cursor-default" : "cursor-pointer active:scale-[0.98]",
          )
        }
      >
        {({ isSelected }) => (
          <>
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150",
                isSelected ? "border-primary" : "border-base-content/30",
              )}
            >
              <SelectionIndicator className="size-2 rounded-full bg-primary" />
            </span>
            <span className="min-w-0 flex-1 leading-snug">
              {label}
              {statusText ? <span className="sr-only"> — {statusText}</span> : null}
            </span>
            {result === "correct" ? (
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden strokeWidth={2} />
            ) : result === "incorrect" ? (
              <X className="mt-0.5 size-4 shrink-0 text-error" aria-hidden strokeWidth={2} />
            ) : null}
          </>
        )}
      </RadioButton>
    </RadioField>
  );
}
