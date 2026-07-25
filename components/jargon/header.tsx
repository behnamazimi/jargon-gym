import type { Domain } from "@/lib/jargon/types";
import { DomainSwitcher } from "./domain-switcher";

type HeaderProps = {
  termCount: number;
  categoryCount: number;
  domain: Domain;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
};

export function Header({
  termCount,
  categoryCount,
  domain,
  isDark,
  onToggleTheme,
  onOpenStats,
  onOpenSettings,
}: HeaderProps) {
  return (
    <header className="mb-[18px] flex flex-wrap items-baseline justify-between gap-2.5">
      <div>
        <h1 className="m-0 text-[22px] font-bold tracking-tight">
          <span className="text-accent">Jargon</span>
        </h1>
        <div className="text-[13px] text-muted">
          {termCount} terms across {categoryCount} categories
        </div>
      </div>
      <div className="flex items-center gap-2">
        <DomainSwitcher domain={domain} />
        <button
          type="button"
          className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-[10px] border border-border bg-surface text-[15px] shadow-sm transition-transform hover:-translate-y-px"
          onClick={onToggleTheme}
          title="Toggle light/dark theme"
        >
          {isDark ? "🌙" : "☀️"}
        </button>
        <button
          type="button"
          className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-[10px] border border-border bg-surface text-[15px] shadow-sm transition-transform hover:-translate-y-px"
          onClick={onOpenStats}
          title="Stats"
        >
          📊
        </button>
        <button
          type="button"
          className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-[10px] border border-border bg-surface text-[15px] shadow-sm transition-transform hover:-translate-y-px"
          onClick={onOpenSettings}
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </header>
  );
}
