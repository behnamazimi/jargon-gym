"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, Mail, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_NAV_ITEMS = [
  { href: "/admin/collections", label: "Collections", icon: Library },
  { href: "/admin/invites", label: "Invites", icon: Mail },
  { href: "/admin/narration", label: "Narration", icon: Volume2 },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div
      role="tablist"
      className="tabs tabs-box tabs-sm w-full flex-nowrap overflow-x-auto bg-base-100 p-1 ring-1 ring-base-content/10 md:w-fit"
    >
      {ADMIN_NAV_ITEMS.map((item) => {
        const selected = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            role="tab"
            aria-selected={selected}
            className={cn("tab grow gap-1.5 no-underline md:grow-0", selected && "tab-active")}
          >
            <Icon className="size-3.5" aria-hidden strokeWidth={1.5} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
