import type * as React from "react";

import { cn } from "@/lib/utils";

export type AlertVariant = "default" | "destructive" | "success";

const variantClasses: Record<AlertVariant, string> = {
  default: "",
  destructive: "alert-error",
  success: "alert-success",
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
      className={cn(
        "alert alert-vertical sm:alert-horizontal text-start! justify-items-start!",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

function AlertContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-content" className={className} {...props} />;
}

function AlertTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 data-slot="alert-title" className={cn("font-bold", className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="alert-description" className={cn("min-w-0 text-sm", className)} {...props} />
  );
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("flex shrink-0 flex-wrap items-center gap-2 sm:justify-self-end", className)}
      {...props}
    />
  );
}

export { Alert, AlertContent, AlertTitle, AlertDescription, AlertAction };
