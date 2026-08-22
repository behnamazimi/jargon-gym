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
      className={cn("alert alert-vertical sm:alert-horizontal", variantClasses[variant], className)}
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
  return <div data-slot="alert-description" className={cn("text-xs", className)} {...props} />;
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-action" className={cn("shrink-0", className)} {...props} />;
}

export { Alert, AlertContent, AlertTitle, AlertDescription, AlertAction };
