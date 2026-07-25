import type { Domain } from "@/lib/jargon/types";

type DomainSwitcherProps = {
  domain: Domain;
};

export function DomainSwitcher({ domain }: DomainSwitcherProps) {
  return (
    <select
      className="cursor-pointer rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] font-medium text-foreground shadow-sm hover:border-accent"
      value={domain.id}
      title="Switch jargon domain"
    >
      <option value={domain.id}>
        {domain.icon} {domain.name}
      </option>
    </select>
  );
}
