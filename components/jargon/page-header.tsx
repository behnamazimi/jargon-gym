import { type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { BackLink, JARGON_HOME_BACK_LABEL, JARGON_HOME_PATH } from "@/components/jargon/back-link";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  icon: LucideIcon;
  title: ReactNode;
  description?: string;
  backHref?: string;
  backLabel?: string;
  showBack?: boolean;
  compactOnPhone?: boolean;
};

export function PageHeader({
  icon: Icon,
  title,
  description,
  backHref = JARGON_HOME_PATH,
  backLabel = JARGON_HOME_BACK_LABEL,
  showBack = true,
  compactOnPhone = false,
}: PageHeaderProps) {
  return (
    <div
      className={cn("flex items-start justify-between gap-3", compactOnPhone && "max-md:sr-only")}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary md:flex">
          <Icon className="size-5" aria-hidden strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-bold tracking-tight text-base-content">
            {title}
          </h1>
          {description ? <p className="mt-1 text-sm text-base-content/60">{description}</p> : null}
        </div>
      </div>
      {showBack ? <BackLink href={backHref} label={backLabel} /> : null}
    </div>
  );
}
