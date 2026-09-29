"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { useAdminToggle } from "@/hooks/use-admin-toggle";
import type { ActionResult } from "@/lib/admin/action";
import { cn } from "@/lib/utils";

type Confirmation = { title: string; description: string; confirmLabel: string };

type AdminSwitchProps = {
  /** The server's value; the switch follows it after every refresh. */
  value: boolean;
  label: string;
  save: (next: boolean) => Promise<ActionResult>;
  disabled?: boolean;
  size?: "sm" | "md";
  /** Ask first when this returns something for the position being switched to. */
  confirm?: (next: boolean) => Confirmation | null;
  /** Where to show a failure; by default it is shown under the switch. */
  hideError?: boolean;
};

export function AdminSwitch({
  value,
  label,
  save,
  disabled,
  size = "md",
  confirm,
  hideError,
}: AdminSwitchProps) {
  const { checked, change, error, isPending } = useAdminToggle(value, save);
  const [asking, setAsking] = useState<{ next: boolean; confirmation: Confirmation } | null>(null);

  function handleChange(next: boolean) {
    const confirmation = confirm?.(next) ?? null;
    if (confirmation) setAsking({ next, confirmation });
    else change(next);
  }

  return (
    <>
      <Switch
        className={cn("toggle-primary", size === "sm" && "toggle-sm")}
        checked={checked}
        disabled={disabled || isPending}
        onCheckedChange={handleChange}
        aria-label={label}
      />
      {error && !hideError ? (
        <p role="alert" className="m-0 mt-1 text-sm text-error">
          {error}
        </p>
      ) : null}
      {asking ? (
        <ConfirmDialog
          isOpen
          onOpenChange={(open) => !open && setAsking(null)}
          {...asking.confirmation}
          onConfirm={() => change(asking.next)}
        />
      ) : null}
    </>
  );
}
