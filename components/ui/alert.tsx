import type * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AlertVariant = "default" | "info" | "success" | "warning" | "destructive";

type VariantConfig = {
  color: string;
  icon: React.ElementType;
  role: "alert" | "status";
};

const variants: Record<AlertVariant, VariantConfig> = {
  default: { color: "[--alert-color:var(--color-base-content)]", icon: Info, role: "status" },
  info: { color: "[--alert-color:var(--color-info)]", icon: Info, role: "status" },
  success: { color: "[--alert-color:var(--color-success)]", icon: CheckCircle2, role: "status" },
  warning: { color: "[--alert-color:var(--color-warning)]", icon: AlertTriangle, role: "alert" },
  destructive: { color: "[--alert-color:var(--color-error)]", icon: AlertCircle, role: "alert" },
};

type AlertProps = Omit<React.ComponentProps<"div">, "title"> & {
  variant?: AlertVariant;
  /** Replaces the variant's icon. `false` hides the icon chip. */
  icon?: React.ReactNode | false;
  /** Shows a close button in the corner. */
  onDismiss?: () => void;
};

/** Soft tinted notice. Children stack in one column next to the icon, so
 *  long text wraps and actions land under it on any width. */
function Alert({
  className,
  variant = "default",
  icon,
  onDismiss,
  children,
  ...props
}: AlertProps) {
  const config = variants[variant];
  const Icon = config.icon;
  const showIcon = icon !== false;

  return (
    <div
      data-slot="alert"
      role={config.role}
      className={cn(
        "@container grid gap-x-3 rounded-box border border-s-[3px] p-3 text-start text-base-content",
        "[--alert-tint:8%] in-data-[theme=dim]:[--alert-tint:14%]",
        "border-[color-mix(in_oklab,var(--alert-color)_28%,var(--color-base-300))] border-s-(--alert-color)",
        "bg-[color-mix(in_oklab,var(--alert-color)_var(--alert-tint),var(--color-base-100))]",
        showIcon ? "grid-cols-[auto_minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)_auto]",
        config.color,
        className,
      )}
      {...props}
    >
      {showIcon ? (
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--alert-color)_18%,transparent)] text-[color-mix(in_oklab,var(--alert-color)_65%,var(--color-base-content))] [&>svg]:size-4"
        >
          {icon ?? <Icon strokeWidth={1.5} />}
        </span>
      ) : null}
      <div className="flex min-h-8 min-w-0 flex-col justify-center gap-1 wrap-anywhere">
        {children}
      </div>
      {onDismiss ? (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Dismiss"
          className="-mt-2.5 -me-2.5 size-11 md:-mt-0.5 md:-me-1 md:size-8"
          onPress={onDismiss}
        >
          <X className="size-4" aria-hidden strokeWidth={1.5} />
        </Button>
      ) : null}
    </div>
  );
}

function AlertContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-content"
      className={cn("flex min-w-0 flex-col gap-1", className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3 data-slot="alert-title" className={cn("m-0 text-sm font-semibold", className)} {...props} />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("min-w-0 text-sm text-base-content/70", className)}
      {...props}
    />
  );
}

/** Buttons stack full width and 44px tall on narrow containers, then sit
 *  inline at their natural size. */
function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        "mt-2 flex flex-col gap-2 @md:flex-row @md:flex-wrap @md:items-center",
        "max-md:[&>*]:min-h-11 [&>*]:justify-center",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertContent, AlertTitle, AlertDescription, AlertAction };
