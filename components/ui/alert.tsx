import type * as React from "react";

import { cn } from "@/lib/utils";

export type AlertVariant = "default" | "destructive";

const variantClasses: Record<AlertVariant, string> = {
  default: "",
  destructive: "alert-error",
};

function Alert({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { variant?: AlertVariant }) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn("alert items-start text-left", variantClasses[variant], className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-title" className={cn("font-medium", className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm text-pretty", className)}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-action" className={cn("shrink-0", className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
