import type * as React from "react";

import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";

const variantClasses: Record<BadgeVariant, string> = {
  default: "badge-primary",
  secondary: "badge-secondary",
  destructive: "badge-error",
  outline: "badge-outline",
  ghost: "badge-ghost",
  link: "badge-ghost",
};

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: React.ComponentProps<"span"> & {
  variant?: BadgeVariant;
  render?: (props: React.HTMLAttributes<HTMLElement>) => React.ReactNode;
}) {
  const badgeClassName = cn("badge", variantClasses[variant], className);

  if (render) {
    const renderProps = {
      "data-slot": "badge",
      "data-variant": variant,
      className: badgeClassName,
      ...props,
    };

    return render(renderProps);
  }

  return <span data-slot="badge" data-variant={variant} className={badgeClassName} {...props} />;
}

export { Badge };
