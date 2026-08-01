import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";
import { cn } from "@/lib/utils";

const contentPageMaxWidthClass = "max-w-2xl";

export const contentPageLinkClass =
  "font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/80";

const contentPageBulletListClass = "list-disc space-y-2 ps-5";

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

type ContentPageMainProps = {
  children: ReactNode;
  className?: string;
};

export function ContentPageMain({ children, className }: ContentPageMainProps) {
  return <article className={cn("mt-10 space-y-10", className)}>{children}</article>;
}

type ContentPageSectionProps = {
  id?: string;
  title: string;
  children: ReactNode;
  className?: string;
};

export function ContentPageSection({ id, title, children, className }: ContentPageSectionProps) {
  return (
    <section id={id} className={cn("scroll-mt-24", className)}>
      <h2 className="m-0 text-lg font-semibold tracking-tight text-base-content">{title}</h2>
      <div className="content-page-body mt-4 flex flex-col gap-4 text-sm leading-relaxed text-base-content/80">
        {children}
      </div>
    </section>
  );
}

type ContentPageBulletListProps = {
  items: readonly ReactNode[];
  className?: string;
};

export function ContentPageBulletList({ items, className }: ContentPageBulletListProps) {
  return (
    <ul className={cn(contentPageBulletListClass, "text-base-content/70", className)}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

type ContentPageTitledBulletItem = {
  title: string;
  body: ReactNode;
};

type ContentPageTitledBulletListProps = {
  items: readonly ContentPageTitledBulletItem[];
  className?: string;
};

export function ContentPageTitledBulletList({
  items,
  className,
}: ContentPageTitledBulletListProps) {
  return (
    <ul className={cn(contentPageBulletListClass, className)}>
      {items.map((item) => (
        <li key={item.title}>
          <strong className="font-medium text-base-content">{item.title}</strong>
          {" — "}
          <span className="text-base-content/70">{item.body}</span>
        </li>
      ))}
    </ul>
  );
}
