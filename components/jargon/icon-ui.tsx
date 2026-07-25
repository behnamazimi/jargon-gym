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

type MenuItemProps = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

export function MenuItem({ icon: Icon, label, onClick, disabled, destructive }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] disabled:opacity-50 ${
        destructive ? "text-red-600 hover:bg-red-50" : "hover:bg-black/5"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </button>
  );
}
