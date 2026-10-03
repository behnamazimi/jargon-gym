import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  /** Shown instead of the icon, e.g. a scene from components/illustrations. */
  illustration?: ReactNode;
  title: ReactNode;
  description?: string;
  children?: ReactNode;
  className?: string;
  titleAs?: "h1" | "h2";
};

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  children,
  className,
  titleAs: TitleTag = "h2",
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-5 text-center", className)}>
      {illustration ?? (
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Icon className="size-6" aria-hidden />
        </div>
      )}
      <div>
        <TitleTag className="font-heading text-2xl font-medium">{title}</TitleTag>
        {description ? (
          <p className="mt-2 max-w-md text-sm text-base-content/70">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
