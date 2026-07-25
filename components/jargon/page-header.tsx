import { ArrowLeft, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { LinkButton } from "@/components/ui/button";

type PageHeaderProps = {
  icon: LucideIcon;
  title: ReactNode;
  description?: string;
  backHref?: string;
  backLabel?: string;
};

export function PageHeader({
  icon: Icon,
  title,
  description,
  backHref = "/jargon",
  backLabel = "Back",
}: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      <LinkButton
        href={backHref}
        variant="ghost"
        size="sm"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {backLabel}
      </LinkButton>
    </div>
  );
}
