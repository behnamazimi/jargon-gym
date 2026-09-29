import Link from "next/link";
import { cn } from "@/lib/utils";

/** Links that look like tabs. Each one is a different address, so this needs no client code. */
export function AdminTabs({
  label,
  tabs,
}: {
  label: string;
  tabs: { href: string; label: string; active: boolean }[];
}) {
  return (
    <nav aria-label={label} className="tabs tabs-box tabs-sm w-fit">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cn("tab", tab.active && "tab-active")}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
