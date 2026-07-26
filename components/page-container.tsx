import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const pageContainerClass = "mx-auto w-full max-w-6xl px-5";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
};

export function PageShell({ children, className, innerClassName }: PageShellProps) {
  return (
    <div
      className={cn(
        "min-h-full bg-gradient-to-b from-primary/[0.06] via-background to-background text-foreground",
        className,
      )}
    >
      <div className={cn(pageContainerClass, "space-y-5 py-7 pb-20", innerClassName)}>
        {children}
      </div>
    </div>
  );
}

type PageCenterProps = {
  children: ReactNode;
  className?: string;
};

export function PageCenter({ children, className }: PageCenterProps) {
  return (
    <div className={cn("flex min-h-full flex-col items-center justify-center py-12", className)}>
      <div className={cn(pageContainerClass, "flex w-full flex-col items-center gap-3")}>
        {children}
      </div>
    </div>
  );
}
