"use client";

import { Check } from "lucide-react";
import { evaluatePasswordRequirements } from "@/lib/auth/password-policy";
import { cn } from "@/lib/utils";

type PasswordRequirementsProps = {
  password: string;
  visible?: boolean;
};

export function PasswordRequirements({ password, visible = true }: PasswordRequirementsProps) {
  if (!visible) {
    return null;
  }

  const results = evaluatePasswordRequirements(password);

  return (
    <ul className="flex flex-col gap-1" aria-live="polite" aria-label="Password requirements">
      {results.map((requirement) => (
        <li
          key={requirement.id}
          className={cn(
            "flex items-center gap-1.5 text-xs",
            requirement.met ? "text-success" : "text-base-content/60",
          )}
        >
          <Check
            className={cn("size-3.5 shrink-0", requirement.met ? "opacity-100" : "opacity-25")}
            aria-hidden
          />
          <span>{requirement.label}</span>
        </li>
      ))}
    </ul>
  );
}
