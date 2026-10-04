import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { PageShell } from "@/components/page-container";
import { cn } from "@/lib/utils";

const contentPageMaxWidthClass = "max-w-2xl";

export const contentPageLinkClass =
  "font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/80";

type ContentPageShellProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
};

export function ContentPageShell({ children, className, innerClassName }: ContentPageShellProps) {
  return (
    <PageShell
      className={className}
      innerClassName={cn(
        "landing-enter mx-auto py-10 pb-24 sm:py-12",
        contentPageMaxWidthClass,
        innerClassName,
      )}
    >
      {children}
    </PageShell>
  );
}

type ContentPageHeaderProps = {
  icon: LucideIcon;
  title: ReactNode;
  description?: string;
  backHref?: string;
  backLabel?: string;
  showBack?: boolean;
};

export function ContentPageHeader(props: ContentPageHeaderProps) {
  return <PageHeader {...props} />;
}

type ContentPageIntroProps = {
  children: ReactNode;
  className?: string;
};

export function ContentPageIntro({ children, className }: ContentPageIntroProps) {
  return <div className={cn("space-y-5", className)}>{children}</div>;
}
