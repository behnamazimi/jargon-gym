import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/jargon/empty-state";
import { PageCenter } from "@/components/page-container";

type StatusPageProps = {
  icon: LucideIcon;
  title: ReactNode;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export function StatusPageBody({ icon, title, description, children, className }: StatusPageProps) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      titleAs="h1"
      className={className}
    >
      {children}
    </EmptyState>
  );
}

export function StatusPage(props: StatusPageProps) {
  return (
    <PageCenter className="min-h-[50vh]">
      <StatusPageBody {...props} />
    </PageCenter>
  );
}
