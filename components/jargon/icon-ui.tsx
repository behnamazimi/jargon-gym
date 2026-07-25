import type { LucideIcon } from "lucide-react";

type MetaItemProps = {
  icon: LucideIcon;
  label: string;
};

export function MetaItem({ icon: Icon, label }: MetaItemProps) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{label}</span>
    </span>
  );
}
